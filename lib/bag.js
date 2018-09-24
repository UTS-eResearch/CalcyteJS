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
const tmp = require("tmp");
const fs = require("fs");
const defaults = require("./defaults.js");

module.exports = function() {
  return {
    target_dir: this.target_dir,
    catalog_path: this.catalog_path,
   

    generate_bag_info: function generate_bag_info() {
      this.bag_meta = {
        "BagIt-Profile-Identifier": defaults.BagIt_Profile_Identifier,
        "DataCrate-Specification-Identifier":
          defaults.DataCrate_Specification_Identifier
      };

      if (this.helper.root_node["contactPoint"] && this.helper.root_node["contactPoint"]["@id"]) {
        contact = this.helper.item_by_id[this.helper.root_node["contactPoint"]["@id"]];
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

      if (this.helper.root_node["publisher"] && this.helper.root_node["publisher"]["@id"]) {
        publisher = this.helper.item_by_id[this.helper.root_node["publisher"]["@id"]];
        
        if(publisher["name"]) {
          this.bag_meta["SourceOrganization"] = publisher.name
          
        }
      }
      if (this.helper.root_node["description"]) {
        this.bag_meta["External-Description"] = this.helper.root_node["description"];
      }
      this.bag_meta["Bagging-Date"] = new Date().toISOString();
      // Return a hash of BagIt style metadata by looking for it in the JSON-LD structure


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
    fix_paths: function fix_paths(catalog_path) {
      console.log(shell.test("-f", catalog_path));
      if (!path.isAbsolute(catalog_path)) {
        catalog_path = path.join("./", catalog_path);
      }
      var catalog =  this.helper.json_ld;
      for (let item of catalog["@graph"]) {
        if (item["path"]) {
          var p = this.helper.value_as_array(item["path"])[0];
          var new_p = path.join("./data/", p);
          item["path"] = [new_p];
        }
      }
      fs.writeFileSync(
        catalog_path,
        JSON.stringify(this.helper.json_ld, null, 2),
        function(err) {
          if (err) {
            return console.log(err, "Error writing in", catalog_path);
          }
        }
      );
    },
    bag: function bag(source_dir, bag_dir, helper) {
     
      // TODO Generate a list of all files
      // FOR NOW: delete CATALOG.json and index.html
      // Generate bag info later
      this.helper = helper;
      var tmpobj = tmp.dirSync();
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
        path.join(__dirname, "..", defaults.DataCrate_profile_file),
        target_dir
      );
      this.fix_paths(path.join(target_dir, defaults.catalog_json_file_name));
      this.target_dir = target_dir;
      return target_dir;
    }
  };
};
