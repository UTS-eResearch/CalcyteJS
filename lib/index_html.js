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
var fs = require("fs");
var ejs = require("ejs");
context = require("../defaults/context.json");
const path = require("path");
const shell = require("shelljs");
const jsonld_helper = require("./jsonldhelper")
var helper = new jsonld_helper();
const filesize = require("filesize");
const display_keys = [
  "name",
  "@type",
  "memberOf",
  "@reverse",
  "isPartOf",
  "fileOf",
  "description",
  "thumbnail",
  "datePublished",
  "creator",
  "path",
  "encodingFormat",
  "contentSize"
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
      details
    ) {
      // Item is the thing we're displaying
      // K is for Key - ie the property name
      // list is the list of values for property k in item
      // details: bool - are we doing pagination? If so need to display the "details element"
      var l = list.length;
      var html = "";
      if (l === 1) {
        html += this.format_property(item, k, list[0]);
      } else if (l <= page_size) {
        if (details) {
          html += ele("details");
          html += ele("summary");
          html += this.format_property_paginated(
            item,
            k,
            list.slice(0, 1),
            page_size
          );
          html += " --to-- ";
          html += this.format_property_paginated(
            item,
            k,
            list.slice(l - 1, l),
            page_size
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
            true
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
          page_size,
          true
        );
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size, l),
          page_size,
          true
        );
      } else {
        html += ele("details");
        html += ele("summary");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(0, 1),
          page_size
        );
        html += " --to-- ";
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size * page_size, page_size * page_size + 1),
          page_size
        );
        html += close("summary");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(0, page_size * page_size),
          page_size,
          true
        );
        html += close("details");
        html += this.format_property_paginated(
          item,
          k,
          list.slice(page_size * page_size, l),
          page_size,
          true
        );
      }
      return html;
    },
    write_html: function write_html(out_path, to_write, node) {
      var up_link;
      var catalog_json_link = "";
      var zip_link;
      var name = this.root_node["name"];
      var json = JSON.stringify(node, null, 2);
     
      if (this.first_page) {
        zip_link = this.zip_path
          ? "<a href='" + this.zip_path + "'>Download a zip file</a>"
          : "";
        var catalog_actual_path = path.join(
          path.dirname(out_path),
          defaults.catalog_json_file_name
        );
        var stats = fs.statSync(catalog_actual_path);
        var mtime = stats.mtime.toISOString();
        catalog_json_link = `<p>A machine-readable version of this page, created at ${mtime} is available <a href='${
          defaults.catalog_json_file_name
          }'>${defaults.catalog_json_file_name}</a></p> `;

        if (this.multiple_files_dir) {
          up_link = `<a href="" class="active"><button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-home"></span>&nbsp;${name}</button></a>`;
        }
      } else if (this.multiple_files_dir) {
        var href = this.get_href(this.root_node["@id"]);
        up_link = `<a href=${href}><button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-home"></span>&nbsp;${name}</button></a> `;
      }

      var time = new Date().toISOString();
  
      fs.writeFileSync(
        out_path,
        this.template({
          html: to_write,
          citation: this.text_citation,
          catalog_json_link: catalog_json_link,
          zip_link: zip_link,
          up_link: up_link,
          time_stamp: time,
          DataCrate_version: defaults.DataCrate_version,
          spec_id: defaults.DataCrate_Specification_Identifier,
          json_ld: json
        })
      );
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

    make_back_links: function make_back_links(item) {
      for (let key of Object.keys(item)) {
        if (key != "@id" && key != "@reverse") {
          for (let part of item[key]) {
            var target = this.item_by_id[part["@id"]];
            var back_link = back_links[key];
            if (target && back_link) {
              if (!target[back_link]) {
                //console.log("Making link", key, back_link, target)
                target[back_link] = [{ "@id": item["@id"] }];
              }
            } else if (
              !dont_back_link.has(key) &&
              item["name"] &&
              target &&
              target["name"]
            ) {
              // We are linking to something
              //console.log("Doing a back link", key, target['name'], item['name'])
              if (!target["@reverse"]) {
                target["@reverse"] = {};
              }
              if (!target["@reverse"][key]) {
                target["@reverse"][key] = [];
              }

              var got_this_reverse_already = false;
              // for (let r of target["@reverse"][key]) {
              //   //console.log(r, r["@id"], item["@id"])
              //   if (r["@id"] === item["@id"]) {
              //     got_this_reverse_already = true
              //    }
              // }
              if (!got_this_reverse_already) {
                target["@reverse"][key].push({ "@id": item["@id"] });
              }
              //console.log(JSON.stringify(target, null, 2))
            }
          }
        }
      }
    },
    format_property: function format_property(item, k, part) {
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
        td_ele += part;
        td_ele += close("b");
        //td_ele.ele("a", part).att('href', item["@id"]).att('class', 'fa fa-external-link').att('title',item["@id"]);
      } else if (
        k === "thumbnail" &&
        part["@id"] &&
        this.item_by_id[part["@id"]]
      ) {
        td_ele += ele("img", {
          src: this.get_file_ref(this.item_by_id[part["@id"]]["path"])
        });
      } else if (k === "path") {
        td_ele += ele("a", { href: encodeURI(this.get_file_ref(part)) });
        td_ele += part
          .replace(/\/$/, "")
          .split("/")
          .pop();
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
        if (item["@id"].match(/^https?:\/\//i)) {
          td_ele += ele("a", {
            href: item["@id"],
            class: "fa fa-external-link",
            title: item.name
          });

          td_ele += item["@id"];
          td_ele += close("a");
        } else {
          td_ele += item["@id"];
        }
      } else if (part["@id"] && this.item_by_id[part["@id"]]) {
        /*else if (
        !item["@name"] &&
        k != "hasPart" &&
        this.item_by_id[part["@id"]] &&
        !(
          this.item_by_id[part["@id"]].name ||
          this.item_by_id[part["@id"]].description
        )
      ) {
        // Embed small bits of info that don't have a name or description

        td_ele += this.dataset_to_html(this.item_by_id[part["@id"]]);
      } */
        var target_name = this.item_by_id[part["@id"]].name
          ? this.item_by_id[part["@id"]].name
          : part["@id"];
        var href = this.get_href(part["@id"]);
        td_ele += ele("a", { href: href });
        td_ele += target_name;
        td_ele += close("a");
      } else {
        td_ele += part;
      }
      return td_ele;
    },
    get_up_path: function get_up_path(path) {
      return "../".repeat(defaults.html_multi_file_dirs.length) + path;
    },
    get_file_ref: function get_file_ref(path) {
      if (this.multiple_files_dir && !this.first_page) {
        return this.get_up_path(path);
      } else {
        return path;
      }
    },
    get_href: function get_href(id) {
      var path;
      if (this.item_by_id[id]["path"]) {
        path = this.item_by_id[id]["path"];
        if (Array.isArray(path)) {
          path = path[0];
        }
      }
      if (this.multiple_files_dir) {
        var link = "./";
        if (path === "./" || path === "data/") {
          link = this.get_up_path(defaults.html_file_name);
        } else {
          if (this.first_page) {
            link += defaults.html_multi_file_dirs.join("/") + "/";
          }
          // TODO: fix this appalling hack and work out a better system of filenames!
          link += id.replace(/\//g, "_").replace("?", "%3F") + ".html";
        }
        return link;
      } else {
        return "#" + id;
      }
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
          rev += this.format_property_paginated(item, r, item["@reverse"][r]);
          rev += close("td");
          rev += close("tr");
        }
        rev += close("table");
        return rev;
      } else {
        return this.format_property_paginated(item, k, data);
      }
    },

    format_header: function format_header(key) {
      el = "";
      if (context[key]) {
        // TODO deal with more complex case by using JSON-LD library
        var term = context[key];
        arrayify(term, function (term) {
          term = term[0];
          var expand1 = term["@id"] ? term["@id"] : term;
          href = context[expand1.split(":")[0]] + expand1.split(":")[1];
        });

        el += ele("span");
        el += key;
        el += ele("sup");
        el += ele("a", { href: href, title: "Definition of: " + key });
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

    dataset_to_html: function dataset_to_html(node) {
      // Turns any item into an HTML table

      console.log("Processing dataset", node["@id"]);
      var path = "pairtree" +  node["@id"].replace(/(..)/g, "/$1");
      console.log(path)
      var html = "";
      var keys = new Set(Object.keys(node));
      if (node["identifier"]) {
        node["identifier"] = helper.value_as_array(node["identifier"]).filter(id => id != node["@id"]);
        if (node["identifier"].length === 0) {
          keys.delete("identifier")
        }
      }
      
      keys.delete("@id");
      keys.delete("filename");
      if (keys.has("encodingFormat")) {
        keys.delete("fileFormat");
      }

      if (!this.first_page && node["@label"] && !node["name"]) {
        html += node["@label"];
        for (let key of Object.keys(node)) {
          for (let v of node[key]) {
            if (
              key != "@id" &&
              key != "@reverse" &&
              v["@id"] &&
              this.item_by_id[v["@id"]]
            ) {
              html += " | " + dataset_to_html(this.item_by_id[v["@id"]]);
            }
          }
        }
        return html;
      }

      html += ele("table", { class: "table", id: node["@id"] });
      html += ele("hr");
      //keys.delete("@type");
      //keys.delete("hasPart");
      html += ele("tr");
      html += ele("th", { style: "white-space: nowrap; width: 1%;" });
      html += "@id";
      html += close("th");
      html += ele("td");
      html += this.format_property(node, "@id", node);
      html += close("td");
      html += close("tr");
      key_set = this.sort_keys(keys);
      for (let key of key_set) {
        var value = node[key];
        html += ele("tr");
        html += ele("th");
        html += this.format_header(key); //[0].toUpperCase() + key.substring(1))
        html += close("th");
        html += ele("td");
        html += this.format_cell(node, key);
        html += close("td");
        html += close("tr");
      }

      html += close("table");
      var cite = this.text_citation;
      if (this.multiple_files_dir) {
        if (this.first_page) {
          out_path = this.out_path;
        } else {
          out_path = path.join(
            this.out_dir,
            node["@id"].replace(/\//g, "_") + ".html"
          );
          cite = node["name"];
        }
        
        this.write_html(out_path, html, node);
        //fs.writeFileSync(out_path, html);

        this.first_page = false;
        //  html = "ERROR IS HERE FOR SURE <a href='" + out_path + "'>" + node["name"] + "   </a> "
      }
      // Only shows in one-page mode
      html += this.dataset_children_to_html(node);

      return html;
    },

    dataset_children_to_html: function dataset_children_to_html(node) {
      var files = [];
      var datasets = [];
      var readmes = [];
      var html = "";
      for (part of ["hasPart", "hasMember"]) {
        if (node[part]) {
          if (!Array.isArray(node[part])) {
            node[part] = [node[part]];
          }
          for (let [key, value] of Object.entries(node[part])) {
            if (value["@id"] && this.item_by_id[value["@id"]]) {
              var child = this.item_by_id[value["@id"]];
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
        html += ele("iframe", {
          width: "80%",
          height: "90%",
          src: this.get_file_ref(readme.path),
          border: 1
        });
        html += close("iframe");
        html += ele("hr");
      }

      if (files.length > 0) {
        html += ele("h1");
        html += "Files: ";
        html += close("h1");
        for (let f of files) {
          html += this.dataset_to_html(f, true);
        }
      }

      for (let [_, set] of Object.entries(datasets)) {
        html += this.dataset_to_html(set, true);
      }

      return html;
    },

    init: function init(crate_data, out_path, multiple_files, template_path) {
      if (template_path) {
        var temp = fs.readFileSync(template_path, { encoding: "utf8" });
        this.template = ejs.compile(temp);
      }

      this.out_path = out_path;

      if (multiple_files) {
        this.multiple_files_dir = defaults.html_multi_file_dirs.join("/"); // Where to write out the
        var out_dir = path.dirname(out_path);
        for (let d of defaults.html_multi_file_dirs) {
          out_dir += "/" + d;
          shell.mkdir("-p", out_dir);
        }
        shell.rm(out_dir + "/*");
        this.out_dir = out_dir;
      } else {
        this.multiple_files_dir = false;
      }
      this.first_page = true;
      // TODO: Use loadjson or somesuch
      // Shift loading into the calcyte script
      if (!crate_data["@graph"]) {
        crate_data = require(crate_data);
      }
      //console.log(crate_data);

      this.json_ld = crate_data;
      this.item_by_id = {};
      this.item_by_url = {};
      this.item_by_type = {}; // dict of arrays
      //console.log("CRATE-data", crate_data)
      graph = crate_data["@graph"];

      for (let i = 0; i < graph.length; i++) {
        var item = graph[i];
        for (let key of Object.keys(item)) {
          if (key != "@id" && key != "@reverse") {
            if (!item[key]) {
              item[key] = "";
            }
            if (!Array.isArray(item[key])) {
              item[key] = [item[key]];
              //console.log("Making array", key, item[key])
            }
          }
        }
        if (item["@id"]) {
          this.item_by_id[item["@id"]] = item;
        }
        if (item["path"]) {
          this.item_by_url[item["path"]] = item;
        }
        if (!item["@type"]) {
          item["@type"] = ["Thing"];
        }
        //console.log("TYPE", item['@type'])
        for (let t of item["@type"]) {
          //console.log(t)
          if (!this.item_by_type[t]) {
            this.item_by_type[t] = [];
          }
          this.item_by_type[t].push(item);
        }
      }
      
      for (let i = 0; i < graph.length; i++) {
        var item = graph[i];
        this.make_back_links(item);
      }
      // A container for our page
    },
    make_index_html: function make_index_html(text_citation, zip_path) {
      var body_el = "";
      this.zip_path = zip_path;
      this.text_citation = text_citation;
      this.first_page = true;
      body_el += ele("div");
      //console.log("DATA", this.item_by_url);
      // Get root of graph
      root_node = this.item_by_url["./"]
        ? this.item_by_url["./"]
        : this.item_by_url["data/"];

      this.root_node = root_node;

      this.text_citation = text_citation;
      if (!text_citation) {
        this.text_citation = root_node["name"];
      }
      //if (root_node) {
      body_el += this.dataset_to_html(root_node, true);
      //}

      delete this.item_by_type["Dataset"];
      delete this.item_by_type["File"];
      delete this.item_by_type["RepositoryCollection"];
      delete this.item_by_type["RepositoryObject"];
      for (let type of Object.keys(this.item_by_type).sort()) {
        body_el += ele("h1");
        body_el += "Contextual info: ";
        body_el += ele("span");
        body_el += this.format_header(type);
        body_el += close("span");
        body_el += close("h1");
        //this.items_to_html(this.item_by_type[type], body_el);
        for (let i of this.item_by_type[type]) {
          body_el += this.dataset_to_html(i, true);
        } //console.log(type);
      }
      body_el += close("div");

      if (!this.multiple_files_dir) {
        this.write_html(this.out_path, body_el, this.json_ld);
      }
    }
  };
};
