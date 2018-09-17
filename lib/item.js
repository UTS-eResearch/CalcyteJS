/* This is part of Calcyte a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2018  University of Technology Sydney

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Class for representing DataCrate items */

var XLSX = require("xlsx");
var path = require("path");
const context = require("../defaults/context.json");
const metadata_property_name = require("./property.js");
const uuidv4 = require("uuid/v4");
const ejs = require("ejs");
const jsonld = require("../lib/jsonldhelper.js");

const helper = new jsonld()


module.exports = function() {
  this.metadata = {};
  this.json_ld = {};
  this.properties = {};
  this.types = [];
  this.id = undefined;
  this.is_file = false;
  this.name = undefined;
  this.nested_items = {};

  function links_to_id(string, collection) {
    var links_to = undefined;
    if (collection.id_lookup[string]) {
      links_to = collection.id_lookup[string].id;
    } else if (collection.name_lookup[string]) {
      links_to = collection.name_lookup[string].id;
    }
    return links_to;
  }

  function make_link(string, collection, el) {
    //console.log("Linking", string);
    var link_id = links_to_id(string, collection);

    if (link_id && link_id.match(/^https?:\/\//i)) {
      el.ele("a", string).att("href", link_id);
      string = "<a href='" + link_id + "'>" + string + "</a>";
    } else if (link_id) {
      el.ele("a", string).att("href", "#" + link_id);
      string = "<a href='#" + link_id + "'>" + string + "</a>";
    } else {
      el.ele("span", string);
    }
    return string;
  }

  return {
    metadata: this.metadata,
    properties: this.properties,
    // TODO - maybe get rid of next line
    column_names: [],
    nested_items: this.nested_items,
    is_file: this.is_file,
    id: this.id,
    name: this.name,
    collection: this.collection,
    types: this.types,

    to_json_ld_fragment: function to_json_ld_fragment() {
      //console.log("Keys at start of output", Object.keys(this.properties));
      var frag = { "@id": String(this.id) };
      //console.log("Setting id", this.id, this.name, this.nested_items);
      //console.log(" NAMELOOKUPS",  this.collection.name_lookup);

      for (let [key, i] of Object.entries(this.nested_items)) {
        frag[key] = i.to_json_ld_fragment();
      }
      for (let [key, f] of Object.entries(this.properties)) {
        if (f.is_type) {
          types = f.data; //Don't output now
        } else if (f.name != "ID") {
          frag[f.name] = [];
          if (!Array.isArray(f.data)) {
            f.data = [f.data];
          }
          for (var k = 0; k < f.data.length; k++) {
            var link_id = f.links_to
              ? f.links_to
              : links_to_id(f.data[k], this.collection);
            //console.log("link_id", link_id, "relational", f.is_relational)
            if (f.is_file) {
              this.is_file = true;
              //types.push("schema:MediaObject");
            } else if (f.is_relational && link_id) {
              //console.log("Looking for relations", f.data[k], this.collection)
              //console.log("GOT A LINK", f.name, f.id);
              frag[f.name].push({ "@id": link_id }); //, "@type" : "@id"
            } else {
              frag[f.name].push(f.data[k]);
            }
          }
          if (frag[f.name].length == 1) {
            frag[f.name] = frag[f.name][0];
          }
        }
      }
      frag["@type"] = this.types;
      if (this.collection.bagged && frag.path) {
        frag.path = path.join("data", frag.path);
      }
      var ident =  helper.value_as_array(this.id)
      for (let id of ident){
        if (id && id.match(/(https?:\/\/)(dx\.)?(doi.org\/10\.)/i)) {
          helper.push_value(frag, "identifier", id.replace(/https?:\/\//i, ""))
        }
        this.json_ld_fragment = frag;
      }
      

      //console.log(frag);
      return frag;
    },
    load_json: function load_json(json_item, collection) {
      //console.log("JSON IS: ", json_item);
      this.types = [];
      this.properties = {};
      this.nested_items = {};
      this.collection = collection;
      //console.log(this)

      for (var [key, value] of Object.entries(json_item)) {
        //console.log(key, value);
        var property = new metadata_property_name();
        property.parse(key, value);
        //this.colum_names.push(k);
        //console.log("Fresh property", property.name, value);

        if (property.is_file) {
          //console.log("FILE ", this.collection.path, value);
          this.id = path.join(this.collection.rel_path, value);
          this.types.push("File");
          var pr = new metadata_property_name();
          pr.parse("path", this.id);
          this.properties[pr.name] = pr;

          this.is_file = value;
        } else if (property.is_id) {
          //console.log("Got an ID", value);
          this.id = value;
        } else if (property.is_name) {
          this.name = value;
        } else if (property.is_type) {
          this.types = property.data;
        }

        // Add to lookup table
        if (this.id) {
          this.collection.id_lookup[this.id] = this;
        } else {
          this.id = uuidv4();
        }

        if (this.name) {
          this.collection.name_lookup[this.name] = this;
        }
        // Add name to lookup table too
        if (property.nested_item_json.length > 0) {
          
          // Need to make new items later
         for (var i = 0; i < property.nested_item_json.length; i++) {
            var nested_json = property.nested_item_json[i];
            //console.log("NESTED", nested_json);
            var nest_this_item = new module.exports();
            nest_this_item.load_json(nested_json, this.collection);
            this.nested_items[property.name] = nest_this_item;
            
          }
        } else {
          this.properties[property.name] = property;
        }
      }
      // If Seigfried returned info about this file then add it
      if (
        this.is_file &&
        this.collection.file_info_by_filename &&
        this.collection.file_info_by_filename[this.is_file]
      ) {
        var file_info = this.collection.file_info_by_filename[this.is_file];
        var prop = new metadata_property_name();
        //console.log("FILE", this.is_file, this.collection.file_info_by_filename[this.is_file].filesize)
        prop.parse("contentSize", String(file_info.filesize));
        this.properties[prop.name] = prop;
        //console.log("file_info\n" + JSON.stringify(file_info));

        var fi = file_info.matches[0]

        /* Siegfried v1.4.5 and earlier used id "pronom" and puid "fmt/44"
           (for example). v1.5.0 and later use ns "pronom" and id "fmt/44".

           Pick which one to use based on which of ns / id is defined
        */

        if ( fi.ns === "pronom" || fi.id === "pronom" ) {
          var pronom = new metadata_property_name();
          const id = fi.ns ? fi.id : fi.puid;
          pronom.parse(
            "fileFormat",
            "http://www.nationalarchives.gov.uk/PRONOM/" + id
          );
          this.properties[pronom.name] = pronom;
        } 

        var name_prop = new metadata_property_name();
        name_prop.parse("encodingFormat", file_info.matches[0].format);
        this.properties[name_prop.name] = name_prop;
      }
      //console.log("MY THINGS", this.items)
    }
  };
};
