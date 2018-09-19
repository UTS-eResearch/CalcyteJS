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

/* Represents a JSON-LD property and its value */
const context = require("../defaults/context.json");
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();

function lowercase_first(name) {
  if (name.length > 0) {
    if (!/[A-Z]/.test(name[1])) {
      name = name[0].toLowerCase() + name.substring(1);
    }
  }
  return name;
}

module.exports = function() {
  this.nested_item_json = [];
  function get_RDF_for_column(name) {
    if (context[name]) {
      return context[name]["@id"] ? context[name]["@id"] : context[name];
    } else {
      return undefined;
    }
  }

  function get_fully_qualified_URI(property_name) {
    /*
          Look up the data dictionary to get an RDF name for column_name.
          */
    property_name = property_name["@id"] ? property_name["@id"] : property_name;
    if (context[property_name]) {
      property_name = context[property_name]["@id"]
        ? context[property_name]["@id"]
        : context[property_name];
    }
    if (property_name && property_name.includes(":")) {
      split_name = property_name.split(":", 2);
      //console.log(split_name);
      namespace = split_name[0];
      name = split_name[1];
      //console.log("Looking up name", namespace, name)
      if (namespace in context && name) {
        return context[namespace] + name;
      }
    }
    return undefined;
  }
  return {
    // Functions, public so they can be tested
    get_fully_qualified_URI: get_fully_qualified_URI,
    get_RDF_for_column: get_RDF_for_column,
    // Public properties
    is_repeating: this.is_repeating,
    is_relational: this.is_relational,
    is_id: this.is_id,
    is_name: this.is_name,
    property: this.property,
    data: this.data,
    is_file: this.is_file,
    id: this.id,
    nested_item_json: this.nested_item_json,

    parse: function parse(name, data = "", links_to = null) {
      this.data = data;
      this.links_to = links_to;
      this.is_relational = this.links_to ? true : false;
      this.is_repeating = false;
      this.is_file = false;
      this.is_type = false;
      this.is_id = false;
      this.is_name = false;
      this.is_extension = false;
      this.is_mimetype = false;
      // Name is separated by > and needs to be turned into a heirarchy
      this.is_nested = false;
      this.parse_content = false;
      this.raw_name = name;
      this.name = name;
      this.nested_item_json = [];

      if (this.name === "ID") {
        this.name = "identifier";
      } else if (this.name === "TYPE:") {
        this.is_type = true;
      } else if (name == "MIME:") {
        this.is_mimetype = true;
      } else if (this.name == "EXTENSION:") {
        this.is_extension = true;
      } else if (this.name.startsWith("RELATION:")) {
        this.name = this.name.substring(9);
        this.is_relational = true;
      } else if (this.name.startsWith("FILE:")) {
        this.name = this.name.substring(5);
        this.is_file = true;
      }
      //Assume what's left of header is a property, and hence starts with lowecase letter
      this.name = lowercase_first(this.name);
      var nest;

      if (this.name.endsWith("*")) {
        this.name = this.name.slice(0, -1);
        this.is_repeating = true;
      } else if ((nest = /(.*)>TYPE:(.*)>/.exec(this.name))) {
        this.name = nest[1];
        //console.log("Nesting, this is the name", this.name)
        var nested_type = nest[2];
        var nested_json = { "TYPE:": nested_type };
        
        var parts = data.replace(/ *, +/, ",").split(",");
        //console.log(parts)
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          var pair = part.match(/(.*?) *: *(.*)/);

          nested_json[lowercase_first(pair[1]).trim()] = pair[2].trim();
        }
        if (!nested_json["name"]) {
          nested_json["name"] = data;
        }
        //console.log("NESTING", nested_json)
        this.nested_item_json.push(nested_json);
        this.data = "";
      }

      this.property = get_RDF_for_column(this.name);
      if (this.property) {
        this.property_URI = get_fully_qualified_URI(this.property);
      } else {
        this.property_URI = undefined;
      }

      //console.log("Looking for IDs", this.name, this.property_URI)
      if (this.property_URI == "http://schema.org/identifier") {
        this.is_id = true;
        //console.log("WE GOT AN ID", this.name)
      }

      if (this.property_URI == "http://schema.org/name") {
        this.is_name = true;
      }

      if (data) {
        //console.log(this.data);
        if (this.is_repeating || this.is_type) {
          this.data = this.data.replace(/, +/g, ",").split(",");
          //console.log("SPLIT", this.type, this.name, this.data)
        } else if (!Array.isArray(this.data)) {
          this.data = [this.data];
        }

        if (data.length === 1) {
          this.data = this.data[0];
        }
      }
    }
  };
};
