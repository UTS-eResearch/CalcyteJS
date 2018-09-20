/* This is part of Calcyte, a tool for implementing the DataCrate data packaging
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

/* Bags a datacrate wich already has a CATALOG.json file */

const path = require("path");
const shell = require("shelljs");
const jsonld = require("jsonld");
const tmp = require("tmp");
const fs = require("fs");
const defaults = require("./defaults.js");

module.exports = function() {
  return {
    target_dir: this.target_dir,
    catalog_path: this.catalog_path,
    json_ld: this.json_ld,
    json_by_id: this.json_by_id,
    json_by_path: this.json_by_path,
    json_by_type: this.json_by_path,

    generate_bag_info: function generate_bag_info() {
      this.index_graph();
      this.bag_meta = {
        "BagIt-Profile-Identifier": defaults.bagit_profile_identifier,
        "DataCrate-Specification-Identifier":
          defaults.datacrate_specification_identifier
      };

      if (this.root_node["contact"] && this.root_node["contact"]["@id"]) {
        contact = this.json_by_id[this.root_node["contact"]["@id"]];
        map = {
          email: "Contact-Email",
          phone: "Contact-Telephone",
          name: "Contact-Name"
        };
        for (var [k, v] of Object.entries(map)) {
          if (contact[k]) {
            this.bag_meta[v] = String(contact[k]);
          }
        }
      }
      if (this.root_node["description"]) {
        this.bag_meta["Description"] = this.root_node["description"];
      }
      this.bag_meta["Bagging-Date"] = new Date().toISOString();
      // Return a hash of BagIt style metadata by looking for it in the JSON-LD structure
    },
    index_graph: function index_graph() {
      //TODO - make this a helper function
      this.catalog_path = path.join(this.target_dir, defaults.catalog_json_file_name);
      this.json_ld = require(this.catalog_path);
      this.json_by_id = {};
      this.json_by_path = {};
      this.json_by_type = {};
      this.graph = this.json_ld["@graph"];
      for (let i = 0; i < this.graph.length; i++) {
        var item = this.graph[i];
        if (item["@id"]) {
          this.json_by_id[item["@id"]] = item;
        }
        if (item["path"]) {
          this.json_by_path[item["path"]] = item;
        }
        if (item["@type"]) {
          if (!this.json_by_type[item["@type"]]) {
            this.json_by_type[item["@type"]] = [];
          }
          this.json_by_type[item["@type"]].push(item);
        }
      }
      this.root_node = this.json_by_path["./"]
        ? this.json_by_path["./"]
        : this.json_by_path["data/"];
    },

    save_bag_info: function save_bag_info() {
      var bag_info = "";
      for (var [k, v] of Object.entries(this.bag_meta)) {
        bag_info += k + ": " + v + "\n";
      }
      fs.writeFileSync(path.join(this.target_dir, "bag-info.txt"), bag_info);
    },
    update: function update_bag_tags() {
      shell.exec("bagit updatetagmanifests " + this.target_dir);
    },
    bag: function bag(source_dir, bag_dir) {
      function fix_paths(catalog_path) {
        console.log(shell.test("-f", catalog_path));
        if (!path.isAbsolute(catalog_path)) {
          catalog_path = path.join("./", catalog_path);
        }
        var catalog = require(catalog_path);
        for (let item of catalog["@graph"]) {
          if (item["path"]) {
            if (!Array.isArray(item["path"])) {
              item["path"] = [item["path"]];
            }
            var p = item["path"][0];
            var new_p = path.join("./data/", p);

            item["path"] = [new_p];
          }
        }
        fs.writeFileSync(
          catalog_path,
          JSON.stringify(catalog, null, 2),
          function(err) {
            if (err) {
              return console.log(err, "Error writing in", catalog_path);
            }
          }
        );
      }
      // TODO Generate a list of all files
      // FOR NOW: delete CATALOG.json and index.html
      // Generate bag info later
      var tmpobj = tmp.dirSync();
      console.log("Tempdir: ", tmpobj.name);
      var bag_name = path.basename(source_dir);
      var target_dir = path.join(bag_dir, bag_name);
      shell.cp(
        path.join(source_dir, defaults.catalog_json_file_name ),
        path.join(tmpobj.name,"CATALOG_backup.json")
      );
      shell.cp(path.join(source_dir, defaults.catalog_json_file_name), tmpobj.name);
      shell.rm(path.join(source_dir, defaults.html_file_name)); // Don't worry, welll make a new one
      shell.exec(
        "bagit create --excludebaginfo " +
          target_dir +
          " " +
          path.join(source_dir, "*")
      );
      shell.rm(path.join(target_dir, "data", defaults.catalog_json_file_name), target_dir);
      shell.exec("bagit update " + target_dir);
      shell.cp(path.join(tmpobj.name, defaults.catalog_json_file_name), target_dir);
      shell.cp(
        path.join(__dirname, "defaults", defaults.DataCrate_profile_file),
        target_dir
      );

      fix_paths(path.join(target_dir, defaults.catalog_json_file_name));
      this.target_dir = target_dir;
      return target_dir;
    }
  };
};
