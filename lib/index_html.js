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

const defaults = require("./defaults.js");
var fs = require("fs-extra");
var ejs = require("ejs");
//context = require("../defaults/context.json");
const path = require("path");
const shell = require("shelljs");
const jsonld_helper = require("./jsonldhelper")
const filesize = require("filesize");
const sha1 = require('sha1');

const display_keys = [
  "name",
  "familyName",
  "givenName",
  "@type",
  "description",
  "funder",
  "memberOf",
  "isPartOf",
  "fileOf",
  "thumbnail",
  "datePublished",
  "creator",
  "path",
  "encodingFormat",
  "contentSize",
  "affiliation",
  "email",

  "@reverse",
];
const page_size = 25;
const back_links = {
  hasFile: "fileOf",
  hasPart: "isPartOf",
  hasMember: "memberOf"
};



const dont_back_link = new Set(Object.values(back_links));
// TODO - Put this in a utility function
const arrayify = function arrayify(something, callback) {
  if (!Array.isArray(something)) {
    something = [something];
  }
  return callback(something);
};

const ele = function ele(name, atts = {}) {
  t = "<" + name;
  for (let key in atts) {
    t += " " + key + " = '" + atts[key] + "'";
  }
  t += "\n>";
  return t;
};

const close = function close(name) {
  return "</" + name + "\n>";
};

module.exports = function () {
  return {
    format_property_paginated: function format_property_paginated(
      item,
      k,
      list,
      details,
      no_thumbs
    ) {
      // Item is the thing we're displaying
      // K is for Key - ie the property name
      // list is the list of values for property k in item
      // details: bool - are we doing pagination? If so need to display the "details element"
      // no_thumbs: Bool, don't show thumbnail (as this is a reverse propery the thmbnail is fill size!)
      list = this.helper.value_as_array(list)
      var l = list.length;
      var html = "";
      if (l === 1) {
        html += this.format_property(item, k, list[0], no_thumbs);
      } else if (l <= page_size) {
        if (details) {
          html += ele("details");
          html += ele("summary");
          html += this.format_property_paginated(
            item,
            k,
            list.slice(0, 1),
            false,
            no_thumbs
          );
          html += " --to-- ";
          html += this.format_property_paginated(
            item,
            k,
            list.slice(l - 1, l),
            false,
            no_thumbs
          );
          html += close("summary");
        }
        html += ele("ul");
        for (let i = 0; i < l; i++) {
          html += ele("li");
          html += this.format_property_paginated(
            item,
            k,
            list.slice(i, i + 1),
            true,
            no_thumbs
          );
          html += close("li");
        }
        html += close("ul");
        if (details) {
          html += close("details");
        }
      } else if (l <= page_size * page_size) {
        html += this.format_property_paginated(
          item,
          k,
          list.slice(0, page_size),
          true,
          no_thumbs
        );
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size, l),
          true,
          no_thumbs
        );
      } else {
        html += ele("details");
        html += ele("summary");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(0, 1),
          true,
          no_thumbs
        );
        html += " --to-- ";
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size * page_size, page_size * page_size + 1),
          true,
          no_thumbs
        );
        html += close("summary");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(0, page_size * page_size),
          true,
          no_thumbs
        );
        html += close("details");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size * page_size, l),
          true,
          no_thumbs
        );
      }
      return html;
    },


    // this and the next function have been factored out from 
    // the old write_html, but really the difference between the
    // home page and the rest should be in the templates

    template_html: function template_html(node, html) {

      if( node['@id'] === this.root_node['@id'] ) {
        return this.template_html_home(node, html);
      }
      var up_link;
      var catalog_json_link = "";
      var zip_link;
      const name = this.helper.get_name(this.root_node);
      
      var href = this.get_href(this.root_node["@id"], node["@id"]);
      up_link = `<a href=${href}><button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-home"></span>&nbsp;${name}</button></a> `;

      return this.template({
        html: html,
        citation: this.text_citation,
        catalog_json_link: "",
        zip_link: "",
        up_link: up_link,
        time_stamp: this.timestamp,
        DataCrate_version: defaults.DataCrate_version,
        spec_id: defaults.DataCrate_Specification_Identifier,
        json_ld: ""
      });


    },


    template_html_home: function template_html_home(node, html) {
      const name = this.helper.get_name(this.root_node);      
      const zip_link = this.zip_path
          ? "<a href='" + this.zip_path + "'>Download a zip file</a>"
          : "";

      const catalog_json_link = `<p>A machine-readable version of this page, created at ${this.catalog_json_mtime} is available <a href='${
          defaults.catalog_json_file_name
          }'>${defaults.catalog_json_file_name}</a></p> `;

      const up_link = `<a href="" class="active"><button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-home"></span>&nbsp;${name}</button></a>`;

      return this.template({
        html: html,
        citation: this.text_citation,
        catalog_json_link: catalog_json_link,
        zip_link: zip_link,
        up_link: up_link,
        time_stamp: this.time_stamp,
        DataCrate_version: defaults.DataCrate_version,
        spec_id: defaults.DataCrate_Specification_Identifier,
        json_ld: this.original_json
      });

    },





    sort_keys: function (keys) {
      // Sort a set or array of keys to be in the same order as those in context.json
      // Returns set
      var keys_in_order = new Set();
      keys = new Set(keys);
      for (let key of display_keys) {
        if (keys.has(key)) {
          keys_in_order.add(key);
        }
      }
      for (let key of keys) {
        if (!keys_in_order.has(key)) {
          keys_in_order.add(key);
        }
      }

      return keys_in_order;
    },

    format_property: function format_property(item, k, part, no_thumbs) {
      /*
      TODO: Work out *my* path

      */
      var td_ele = "";
      
      if (!part) {
        // TODO: Not sure if this ever happens..
      } else if (k == "@type") {
        td_ele += this.format_header(part);
      } else if (k === "name") {
        td_ele += ele("b");
        td_ele += this.helper.get_name(item);
        td_ele += close("b");
        //td_ele.ele("a", part).att('href', item["@id"]).att('class', 'fa fa-external-link').att('title',item["@id"]);
      } else if (
        k === "thumbnail" &&
        !no_thumbs &&
        part["@id"] &&
        this.helper.item_by_id[part["@id"]]
      ) {
        td_ele += ele("img", {
          src: this.get_file_ref(this.helper.item_by_id[part["@id"]]["path"], item["@id"])
        });
      } else if (k === "path") {
        td_ele += ele("a", { href: encodeURI(this.get_file_ref(part, item["@id"])) });
        td_ele += part
          .replace(/\/$/, "")
          .split("/")
          .pop();
        td_ele += close("a");
      } else if (k === "url") {
        td_ele += ele("a", { href: part });
        td_ele += part;
        td_ele += close("a");
      } else if (k === "contentSize") {
        td_ele += filesize(part);
      } else if (
        k === "encodingFormat" &&
        part.fileFormat &&
        part.fileFormat.match(/^https?:\/\//i)
      ) {
        td_ele += ele("a", {
          href: part.fileFormat,
          class: "fa fa-external-link",
          title: part.fileFormat
        });
        td_ele += part;
        td_ele += close("a");
      } else if (k == "@id") {
        if (item["@id"] && item["@id"].match(/^https?:\/\//i)) {
          td_ele += ele("a", {
            href: item["@id"],
            class: "fa fa-external-link",
            title: this.helper.get_name(item)
          });

          td_ele += item["@id"];
          td_ele += close("a");
        } else {
          td_ele += item["@id"];
        }
      }  else if (
        k != "hasPart" &&
        this.helper.item_by_id[part["@id"]] &&
        this.helper.item_by_id[part["@id"]]["@type"] == "PropertyValue" &&
        "value" in this.helper.item_by_id[part["@id"]] &&
        "name" in this.helper.item_by_id[part["@id"]]

      ) {
        td_ele += this.helper.get_name(this.helper.item_by_id[part["@id"]]) + " : " + this.helper.item_by_id[part["@id"]].value
      } 
      
      else if (part["@id"] && this.helper.item_by_id[part["@id"]]) {
        var target_name = this.helper.get_name(this.helper.item_by_id[part["@id"]])
          ? this.helper.get_name(this.helper.item_by_id[part["@id"]])
          : part["@id"];
        var href = this.get_href(part["@id"], item["@id"]);
        td_ele += ele("a", { href: href });
        td_ele += target_name;
        td_ele += close("a");
      } else if (part["@id"] && part["@label"]) {
        td_ele +=  `<a href="${part["@id"]}"  class="fa fa-external-link">${part["@label"]}<a/>`
      }
      else if (part["@value"]) {
        td_ele  += part["@value"];
      }else {
        td_ele += part;
      }

      return td_ele;
    },
    get_up_path: function get_up_path(path) {
      return "../".repeat(defaults.html_multi_file_dirs.length) + path;
    },

    // FIXME: first_page - this needs to have a better way to tell
    // if it's on the front page or not

    get_file_ref: function get_file_ref(dest_path, from_id) {
      dest_path = this.helper.value_as_array(dest_path)[0]
      if (this.multiple_files && !this.is_root_node(from_id)) {
        var source_path = path.join(this.get_html_path(from_id), this.html_file_name);
        return path.relative(path.dirname(source_path), dest_path);
      } else {
        return dest_path;
      }
    },

    get_html_path: function get_html_path(id) {
      if (this.helper.item_by_id[id] && this.helper.item_by_id[id]["path"]) {
        var actual_path = this.helper.value_as_array(this.helper.item_by_id[id]["path"])[0];
        if (actual_path === "./" || actual_path === "data/") {
          return './';
        } 
      }
   
      var p = "";
      p += defaults.html_multi_file_dirs +  "/";
      id = sha1(id)
      p += id.replace(/(........)/g, '$1/').replace(/([^\/])$/, "$1/")
      return p 
    },

    get_href: function get_href(id, from_id) {
      if (!this.multiple_files) {
        return "#" + id;
      }
      var dest_path = this.get_html_path(id) + this.html_file_name;
      var source_path = this.get_html_path(from_id) + this.html_file_name;
      
      return path.relative(path.dirname(source_path), dest_path);
    },

    format_cell: function (item, k) {
      var data = item[k];

      if (k === "@reverse") {
        var rev = ele("table", { class: "table" });
        rev += ele("tr");
        rev += ele("th", { style: "white-space: nowrap; width: 1%;" });
        rev += "Relationship";
        rev += close("th");
        rev += ele("th");
        rev += "Referenced-by";
        rev += close("th");
        rev += close("tr");
        
        for (let r of Object.keys(item["@reverse"])) {
          rev += ele("tr");
          rev += ele("th");
          rev += r;
          rev += close("th");
          rev += ele("td");
          rev += this.format_property_paginated(item, r, item["@reverse"][r], false,  true);
          rev += close("td");
          rev += close("tr");
        }
        rev += close("table");
        return rev;
      } else {
        return this.format_property_paginated(item, k, data, false, false);
      }
    },

    format_header: function format_header(key) {
      el = "";
      var term_href = this.helper.get_uri_for_term(key);
      if (this.helper.item_by_id[term_href] && this.helper.item_by_id[term_href]["sameAs"]) {
        term_href = this.helper.item_by_id[term_href]["sameAs"];
      }
      // the 'http' check here is to eliminate a spurious 'nullProject' href which was
      // screwing up test results
      if (term_href && term_href.substring(0, 4) === 'http' ) {
        // TODO deal with more complex case by using JSON-LD library  
        el += ele("span");
        el += key;
        el += ele("sup");
        el += ele("a", { href: term_href, title: "Definition of: " + key });
        el += "?";
        el += close("a");
        el += close("sup");
        el += close("span");
        return el;
      } else {
        if (key === "@reverse") {
          el += "Items referencing this:";
        } else {
          el += key;
        }
      }
      return el;
    },

    is_root_node: function is_root_node(node) {
      // true if this is the root node
      // used to replace the stateful this.first_page stuff
      if( typeof(node) === 'string') {
        return ( node === this.root_node['@id'] );
      } else {
        return ( node['@id'] === this.root_node['@id'] )
      }
    },

    dataset_to_html: function dataset_to_html(node) {
      // returns an array of { node: html: } objects, because
      // it can recurse into the children for some nodes

      var html = "";
      var keys = new Set(Object.keys(node));
      if (node["identifier"]) {
        node["identifier"] = this.helper.value_as_array(node["identifier"]).filter(id => id != node["@id"]);
        if (node["identifier"].length === 0) {
          keys.delete("identifier")
        }
      }
      keys.delete("@id");
      keys.delete("filename");
      keys.delete("@reverse");
      if (keys.has("encodingFormat")) {
        keys.delete("fileFormat");
      }
      if ( !this.is_root_node(node) && node["@label"] && !this.helper.get_name(node)) {
        html += node["@label"];
        for (let key of Object.keys(node)) {
          node[key] = this.helper.value_as_array(node[key])

          for (let v of node[key]) {
            if (
              key != "@id" &&
              key != "@reverse" &&
              v["@id"] &&
              this.helper.item_by_id[v["@id"]]
            ) {
              //html += " | " + this.dataset_to_html(this.helper.item_by_id[v["@id"]]);
            }
          }
        }
        return { node: node, html: html };
      }


      html += ele("table", { class: "table", id: node["@id"] });
      html += ele("hr");
      //keys.delete("@type");
      //keys.delete("hasPart");
      if (!node["@id"].startsWith("./")) {
        html += ele("tr");
        html += ele("th", { style: "white-space: nowrap; width: 1%;" });
        html += "@id";
        html += close("th");
        html += ele("td");
        html += this.format_property(node, "@id", node, false);
        html += close("td");
        html += close("tr");
      }

      key_set = this.sort_keys(keys);
      // Show back-links last
      if ("@reverse" in node) {
        key_set.add("@reverse")
      }
      for (let key of key_set) {
        var value = node[key];
        html += ele("tr");
        html += ele("th");
        html += this.format_header(key); 
        html += close("th");
        html += ele("td");
        html += this.format_cell(node, key);
        html += close("td");
        html += close("tr");
      }

      html += close("table");

      if( this.first_page ) {
        this.first_page = false;
      }
      // Only shows in one-page mode. ???

      const pages = [ { html: html, node: node } ];

      pages.push(...this.dataset_children_to_html(node))



      return pages;

      // html += this.dataset_children_to_html(node);


      // return html;
    },

    dataset_children_to_html: function dataset_children_to_html(node) {

      // now returns an array of { node: html: }

      var files = [];
      var datasets = [];
      var readmes = [];

      var pages = [];

      for (part of ["hasPart", "hasMember", "hasFile"]) {
        if (node[part]) {
          if (!Array.isArray(node[part])) {
            node[part] = [node[part]];
          }
          for (let [key, value] of Object.entries(node[part])) {
            if (value["@id"] && this.helper.item_by_id[value["@id"]]) {
              var child = this.helper.item_by_id[value["@id"]];
              if (child["@type"]) {
                // if (!Array.isArray(child['@type'])) {
                //     child['@type'] = [child['@type']];
                // }

                if (
                  child["@type"].includes("Dataset") ||
                  child["@type"].includes("RepositoryCollection") ||
                  child["@type"].includes("RepositoryObject") ||
                  (part == "hasMember" && child["@type"].includes("File"))
                ) {
                  datasets.push(child);
                }

                if (child["@type"].includes("File")) {
                  files.push(child);
                  if (/README\.\w*$/.test(child["path"])) {
                    readmes.push(child);
                  }
                }
              }
            }
          }
        }
      }
      for (readme of readmes) {
        //var details = html.ele("details").att("open","open");
        //console.log("Making readme", readme.path)
        var html = ele("iframe", {
          width: "80%",
          height: "90%",
          src: this.get_file_ref(readme.path, node["@id"]),
          border: 1
        });
        html += close("iframe");
        pages.push({ node: readme, html: html});
      }


      if (files.length > 0) {
      // how to handle these h1 separator bits? I'm leaving them out for now
        // html += ele("h1");
        // html += "Files: ";
        // html += close("h1");
        for (let f of files) {
          pages.push(...this.dataset_to_html(f));
        }
      }

      for (let [_, set] of Object.entries(datasets)) {
        pages.push(...this.dataset_to_html(set));
      }

      return pages;
    },


    // 

    init: function init(options) {

      var crate_data = options['catalog_json'];
      const multiple_files = options['multiple_files'];
      const template_path = options['template_path'] || defaults.catalog_template;

      if (template_path) {
        var temp = fs.readFileSync(template_path, { encoding: "utf8" });
        this.template = ejs.compile(temp);
      }

      this.timestamp = options['force_timestamp'] || new Date().toISOString();

      this.out_dir = options['out_dir'];
      this.first_page = true;
      this.multiple_files = options['multiple_files'];
      this.html_file_name = defaults.html_file_name;

      if (multiple_files) {
        shell.rm("-rf", path.join(this.out_dir, defaults.html_multi_file_dirs, "*"))
      }


      if( options['force_json_timestamp'] ) {
        this.catalog_json_mtime = options['force_json_timestamp'];
      } 
      
      if (!crate_data["@graph"]) {
        // FIXME or don't (the json timestamping I care about will be
        // in the async version)
        //if( !options['force_json_timestamp'] ) {
        //  const stats = fs.statSync(crate_data);
        //  this.catalog_json_mtime = stats.mtime.toISOString()
        //} 
        crate_data = require(crate_data);
      }

      this.helper = new jsonld_helper();
      this.helper.init(crate_data)
      this.helper.add_back_links()

      this.original_json = JSON.stringify(this.helper.json_ld, null, 2);


    },


    // pure version of init which lets the calling code do the 
    // filesystem interactions
    // for now, it doesn't work in multiple_files mode, because
    // in that the dataset_

    // TODO: init() above should call this


    init_pure: function (options) {

      this.first_page = true;
      this.multiple_files = options['multiple_files'];
      this.html_file_name = options['html_file_name'] || defaults.html_file_name;
      this.timestamp = options['force_timestamp'] || new Date().toISOString();
      this.catalog_json_mtime = options['json_timestamp'];
      this.helper = new jsonld_helper();
      this.helper.init(options['catalog_json'])
      this.helper.add_back_links()
      this.original_json = JSON.stringify(this.helper.json_ld, null, 2);
    },



    make_index_html: function make_index_html(text_citation, zip_path) {

      // sync version 


      const pages = this.make_index_pages(text_citation, zip_path);

      for( var i in pages ) {
        const p = pages[i];
        const page_html = this.template_html(p.node, p.html);
        const out_path = path.join(this.out_dir, this.get_html_path(p.node['@id']));
        fs.ensureDirSync(out_path);
        fs.writeFileSync(path.join(out_path, this.html_file_name), page_html);
      }
    },
 
    // this is a utility so that init_pure doesn't have to do the async load

    load_template: async function load_template() {
      const template_buffer = await fs.readFile(defaults.catalog_template);
      const template_ejs = template_buffer.toString();
      this.template = ejs.compile(template_ejs);
    },



    make_index_pure: function make_index_pure(text_citation, zip_path) {


      const pages = this.make_index_pages(text_citation, zip_path);

      return pages.map((p) => {
        return {
          path: path.join(this.get_html_path(p.node['@id'])),
          html: this.template_html(p.node, p.html)
        };
      });
    },



    make_index_pages: function make_index_pages(text_citation, zip_path) {

      // this returns an array of { node: html: } objects which
      // can then be written out to paths

      var body_el = "";
      this.zip_path = zip_path;
      this.text_citation = text_citation;
      this.first_page = true;
      body_el += ele("div");

      root_node = this.helper.item_by_url["./"]
        ? this.helper.item_by_url["./"]
        : this.helper.item_by_url["data/"];

      this.root_node = root_node;

      this.text_citation = text_citation;
      if (!text_citation) {
        this.text_citation = this.helper.get_name(root_node);
      }

      delete this.helper.item_by_type["Dataset"];
      delete this.helper.item_by_type["File"];
      delete this.helper.item_by_type["RepositoryCollection"];
      delete this.helper.item_by_type["RepositoryObject"];

      const pages = this.dataset_to_html(root_node);

      for (let type of Object.keys(this.helper.item_by_type).sort()) {

        for (let node of this.helper.item_by_type[type]) {
          pages.push(...this.dataset_to_html(node, true));
        } 
      }

      //body_el += close("div");
      //if (!this.multiple_files) {
      //  pages.push({node: root_node, html: body_el});
      //}


      return pages;
    },



  };



};
