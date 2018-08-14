var jsonld = require("jsonld");
var fs = require("fs");
var defaults = require("./defaults.js");
var program = require("commander");
var XLSX = require("xlsx");
var path = require("path");

const context = require("./defaults/context.json");
const Property = require("./property.js");
const Item = require("./item.js");
const uuidv4 = require("uuid/v4");
const shell = require("shelljs");
var fs = require("fs");
//const catalog_template = require("defaults/catalog_template.html");
const builder = require("xmlbuilder");
const Index = require("./index_html.js");
const Datacite = require("./datacite.js");

module.exports = function() {
  this.collection_metadata = new Item();
  this.children = [];
  this.rel_path = "./";
  this.items = [];
  this.name_lookup = {};
  this.id_lookup = {};
  this.json_ld = {};
  this.field_names_by_type = {};
  this.existing_catalogs = [];
  this.root_node = {};

  function get_collection_metadata(workbook, collection) {
    // TODO - make the collection just another kind of item object
    raw_collection_metadata = XLSX.utils.sheet_to_json(
      workbook.Sheets["Collection"]
    );
    var item_json = {};

    for (var i = 0; i < raw_collection_metadata.length; i++) {
      var name_value = raw_collection_metadata[i];
      if (item_json[name_value["Name"]]) {
        //console.log("VALUE", name_value['Name'] );
        item_json[name_value["Name"]].push(name_value["Value"]);
      } else {
        item_json[name_value["Name"]] = [name_value["Value"]];
      }
    }

    item_json["TYPE:"] = "Dataset";
    item_json["path"] = collection.rel_path;
    if (!(collection.rel_path === "./")) {
      //console.log("Setting dataset based on path");
      item_json["ID"] = collection.rel_path;
      //item_json["TYPE:"] = "Dataset";
    } else if (!item_json["ID"]) {
      item_json["ID"] = collection.rel_path;
    }
    collection.collection_metadata.load_json(item_json, collection);
  }

  function get_metadata(workbook, collection, sheet_name) {
    metadata = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name]);
    for (var i = 0; i < metadata.length; i++) {
      item_json = metadata[i];

      //console.log("JSON", item_json);
      item = new Item();
      item.load_json(item_json, collection);
      collection.items.push(item);
    }
  }
  function flattenit(json, collection) {
    var promises = jsonld.promises;
    json["@context"] = context;
    var promise = promises.flatten(json, context); //frame(json, frame);
    return promise;
  }

  return {
    collection_metadata: this.collection_metadata,
    children: this.children,
    rel_path: this.rel_path,
    dir: this.dir,
    id_lookup: this.id_lookup,
    name_lookup: this.name_lookup,
    items: this.items,
    json_ld: this.json_ld,
    existing_catalogs: this.existing_catalogs,
    bagged: this.bagged,
    root_node: this.root_node,
    json_by_path: this.json_by_path,
    json_by_id: this.json_by_id,
    json_by_type: this.json_by_type,

    get_unique_catalog_name: function get_unique_catalog_name(
      dir,
      existing_catalogs = []
    ) {
      var index = 0;
      dir = path.basename(dir).replace(" ", "_");
      var potential_catalog_filename = `${
        defaults.catalog_root_name
      }_${dir}.xlsx`;
      while (existing_catalogs.includes(potential_catalog_filename)) {
        index += 1;
        potential_catalog_filename = `${
          defaults.catalog_root_name
        }_${dir}_${index}.xlsx`;
        //console.log(index, potential_catalog_filename);
      }
      //console.log(index, potential_catalog_filename)
      return potential_catalog_filename;
    },

    index_graph: function index_graph() {
      // TODO - PUT THIS IN A HELPER MODULE
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

    generate_bag_info: function generate_bag_info() {
      //TODO: Remove this and us bag.js which is more generic
      this.index_graph();
      this.bag_meta = {
        "BagIt-Profile-Identifier":
          "https://raw.githubusercontent.com/UTS-eResearch/datacrate/master/spec/0.2/profile-datacrate-v0.2.json",
        "DataCrate-Specification-Identifier":
          "https://github.com/UTS-eResearch/datacrate/blob/master/spec/0.2/data_crate_specification_v0.2.md"
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

      // Return a hash of BagIt style metadata by looking for it in the JSON-LD structure
    },

    save_bag_info: function save_bag_info() {
      //TODO: Remove this and use bag.js
      var bag_info = "";
      for (var [k, v] of Object.entries(this.bag_meta)) {
        bag_info += k + ": " + v + "\n";
      }
      fs.writeFileSync(path.join(this.dir, "bag-info.txt"), bag_info);
    },

    update: function update_bag_tags() {
      //TDOD get rid of this - use bag.js
      shell.exec("bagit updatetagmanifests " + this.dir);
    },

    to_json: function to_json(graph) {
      if (!this.collection_metadata) {
        this.collection_metadata = new Item();
      }
      if (this.parent) {
        this.bagged = this.parent.bagged;
      }

      var collection_json = this.collection_metadata.to_json_ld_fragment();
      graph.push(collection_json);
      //console.log("COLLECTION METADATA", json);
      for (var [key, item] of Object.entries(this.items)) {
        item_json = item.to_json_ld_fragment();
        // Keep track of whether to add this to the graph
        var exists = true;

        //console.log("THINGS", item.id, item.5, item.name)
        if (item.is_file) {
          if (shell.test("-e", path.join(this.root_dir, item.id))) {
            if (!collection_json["hasPart"]) {
              collection_json["hasPart"] = [];
            }
            collection_json["hasPart"].push({
              "@id": item.id
            });
            if (!item_json["name"]) {
              item_json["name"] = item.id;
            }
          } else {
            exists = false;
          }
        }
        if (exists) {
          graph.push(item_json);
        }
      }
      //Sub collections
      this.children.forEach(function(child) {
        child.to_json(graph);
        if (!collection_json["hasPart"]) {
          collection_json["hasPart"] = [];
        }
        collection_json["hasPart"].push({
          "@id": child.collection_metadata.id
          //"@type": "@id"
        });
      });
    },
    bag: function bag(bag_dir) {
      // TODO Generate a list of all files
      // FOR NOW: delete DataCrate files
      // Generate bag info later
      shell.rm("-f", path.join(this.dir, defaults.catalog_json_file_name));
      shell.rm("-f", path.join(this.dir, defaults.html_file_name));
      shell.exec(
        "bagit create --excludebaginfo " +
          bag_dir +
          " " +
          path.join(this.dir, "*")
      );
      this.bagged = true;
      this.dir = bag_dir;
    },
    to_json_ld: function to_json_ld() {
      // Turn the entire collection into a JSON-LD document

      json = {
        "@graph": [],
        "@context": context
      };

      this.to_json(json["@graph"]);

      //console.log("JSON", JSON.stringify(json, null, 2));
      json = JSON.parse(JSON.stringify(json));
      //console.log(JSON.stringify(json, null, 2));
      var collection = this;
      promise = flattenit(json, this);
      return promise.then(
        function(flattenated) {
          collection.json_ld = flattenated;
          collection.json_by_id = {};
          collection.json_by_url = {};
          for (let iid = 0; iid < flattenated["@graph"].length; iid++) {
            var item = flattenated["@graph"][iid];
            collection.json_by_id[item["@id"]] = item;
            if (item.path) {
              collection.json_by_url[item.path] = item;
            }
          }
          fs.writeFileSync(
            path.join(collection.dir, defaults.catalog_json_file_name),
            JSON.stringify(
              {
                "@graph": flattenated["@graph"],
                "@context": flattenated["@context"]
              },
              null,
              2
            ),
            function(err) {
              if (err) {
                return console.log(err, "Error writing in", collection.dir);
              }
              console.log(
                "The file was saved!" +
                  path.join(collection.dir, defaults.catalog_json_file_name)
              );
            }
          );
        },
        function(err) {
          console.log(err);
        }
      );
    },
    read: function read(dir, rel_path = "./", parent = false, max_depth = 1) {
      //console.log("existing", parent.existing_catalogs)
      if (max_depth) {
        this.max_depth = max_depth;
      } else {
        this.max_depth = defaults.max_depth;
      }
      if (parent) {
        this.parent = parent;
        this.depth = parent.depth + 1;
        this.name_lookup = parent.name_lookup;
        this.id_lookup = parent.id_lookup;
        this.existing_catalogs = parent.existing_catalogs;
        this.root_dir = parent.root_dir;
        this.bagged = parent.bagged;
        //console.log(this.existing_catalogs);
      } else {
        this.depth = 1;
        this.name_lookup = {};
        this.id_lookup = {};
        this.existing_catalogs = [];
        this.root_dir = dir;
        this.bagged = false;
      }
      //console.log("XXXXXX Collecting", dir, "Depth", this.depth);
      this.children = [];
      this.dir = dir;
      this.rel_path = rel_path;
      this.file_info = null;

      //console.log("Lookup tables", this.name_lookup, this.id_lookup);
      //console.log("dir", dir);
      //console.log(('sf -nr -json "' + dir + '"'));

      //console.log("file", JSON.stringify(this.file_info_by_filename, null, 2));
      var items = fs.readdirSync(dir);

      //console.log("These are the items", dir, items);
      if (items) {
        //console.log("ITEMS NOW", items);
        //TODO - make this a testable function
        var catalog_regex = new RegExp(`^${defaults.catalog_root_name}.*xlsx$`);
        var catalogs = items.filter(item => catalog_regex.test(item));
        this.existing_catalogs = this.existing_catalogs.concat(catalogs);
        if (catalogs.length > 1) {
          console.log("More than one catalog, using this one: ", catalogs[0]);
        }
        var catalog_file_regex = new RegExp(
          `^${defaults.catalog_root_name}.*(xlsx|html|json)$`
        );

        items = items.filter(item => !catalog_file_regex.test(item));
        items = items.filter(item => !defaults.ignore_file_regex.test(item));
        items = items.filter(item => shell.test("-f", path.join(dir, item)));
        //console.log("CATALOGS", catalogs)
        //TODO - make this configurable
        if (catalogs.length === 0) {
          //console.log("Making new catalog");
          var catalog_file = !parent
            ? `${defaults.catalog_root_name}.xlsx`
            : `${defaults.catalog_root_name}_subdir.xlsx`;
          var new_catalog_file = this.get_unique_catalog_name(
            dir,
            this.existing_catalogs
          );
          this.existing_catalogs.push(new_catalog_file);
          //console.log("EXISTING AT THIS POINT", this.existing_catalogs);
          catalogs = [new_catalog_file];
          fs.writeFileSync(
            path.join(dir, new_catalog_file),
            fs.readFileSync(path.join(__dirname, "defaults", catalog_file))
          );
          //console.log("New Catalog", new_catalog_file);
          //COPY IN A NEW CATALOG
          //IF ROOT - use default

          //ELSE sub catalog
        }
        if (catalogs.length > 0) {
          if (items.length < defaults.max_files_in_dir) {
            this.file_info = JSON.parse(
              shell.exec('sf -nr -json "' + dir + '"', { silent: true }).stdout
            );
            //console.log("FILES", JSON.stringify(this.file_info.files, null, 2));
            this.file_info_by_filename = {};
            for (var i = 0; i < this.file_info.files.length; i++) {
              var f = this.file_info.files[i];
              this.file_info_by_filename[f.filename.replace(/.*\//, "")] = f;
            }
          }
          //console.log(dir, catalogs[0]);
          catalog_path = path.join(dir, catalogs[0]);
          this.workbook = XLSX.readFile(catalog_path); //First one found only
          sheet_names = this.workbook.SheetNames;
          for (var i = 0; i < sheet_names.length; i++) {
            sheet_name = sheet_names[i];
            //console.log("Processing sheet", sheet_name);
            var sheet = this.workbook.Sheets[sheet_name];
            //console.log(sheet);
            if (sheet_name == "Collection") {
              get_collection_metadata(this.workbook, this);
            } else if (sheet_name == "Files" && this.file_info) {
              var header_array = XLSX.utils.sheet_to_csv(
                sheet,
                (options = { header: false })
              );
              //console.log("HEADER ARRAY", header_array.split("\n")[0].split(","));
              var header = header_array.split("\n")[0].split(",");
              //console.log(header);
              sheet_json = XLSX.utils.sheet_to_json(sheet);
              //sheet_json = XLSX.utils.sheet_to_json(this.workbook.Sheets['Files']);
              //console.log("SHEET JSON ORIGINAL", sheet_json);
              sheet_json.forEach(function(row) {
                var f = row["FILE:Filename"];
                if (f) {
                  if (items.includes(f)) {
                    items = items.filter(function(e) {
                      return e !== f;
                    });
                  } else {
                    row["*MISSING-FILE*"] = "1";
                  }
                }
              });
              // items now only contains new files so add them

              items.forEach(function(f) {
                sheet_json.push({ "FILE:Filename": f });
              });
              // Iterate over items and add files
              //console.log("SHEET_JSON UPDATED", sheet_json);
              //console.log(sheet);

              this.workbook.Sheets["Files"] = XLSX.utils.json_to_sheet(
                sheet_json,
                (options = { header: header })
              );
              XLSX.writeFile(this.workbook, catalog_path);
              //console.log(XLSX.utils.sheet_to_json(this.workbook.Sheets['Files']));
              get_metadata(this.workbook, this, "Files");

              // Find subdirs

              // Write back
            } else {
              get_metadata(this.workbook, this, sheet_name);
            }

            //console.log("COLLECTION METADATA:", this.collection_metadata);
          }
        }

        var subdirs = fs
          .readdirSync(dir)
          .filter(
            item =>
              fs.lstatSync(path.join(dir, item)).isDirectory() &&
              !item.match(defaults.ignore_dir_regex)
          );
        //console.log("Subdirs", subdirs, defaults.ignore_dir_regex);
        if (subdirs.length > 0) {
          for (var i = 0; i < subdirs.length; i++) {
            if (this.depth < this.max_depth) {
              var child = new module.exports();
              child.read(
                path.join(dir, subdirs[i]),
                path.join(this.rel_path, subdirs[i]),
                this,
                this.max_depth
              );
              this.existing_catalogs = child.existing_catalogs;
              this.children.push(child);
            } else {
              item = new Item();
              item.load_json(
                {
                  "FILE:Filename": subdirs[i],
                  name: "Directory: " + subdirs[i]
                },
                this
              );
              this.items.push(item);
            }
          }
          //console.log("NAMES HERE", this.name_lookup);
        }
      }
    }
  };
};
