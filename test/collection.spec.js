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

/* Test for collection.js */

const Collection = require("../lib/collection.js");
const assert = require("assert");
const shell = require("shelljs");
var fs = require("fs");
var path = require("path");
const XLSX = require("xlsx");
const Datacite = require("../lib/datacite.js");

const fixtures = require("./fixtures");


describe("Create unique CATALOG.xlsx filenames", function() {


  it("Should create nice names", function(done) {
    var c = new Collection();

    assert.equal(
      c.get_unique_catalog_name("/home/me/my_dir", (existing_catalogs = [])),
      "CATALOG_my_dir.xlsx"
    );
    assert.equal(
      c.get_unique_catalog_name(
        "/home/me/my_dir",
        (existing_catalogs = ["CATALOG_my_dir.xlsx"])
      ),
      "CATALOG_my_dir_1.xlsx"
    );
    assert.equal(
      c.get_unique_catalog_name(
        "/home/me/my_dir",
        (existing_catalogs = ["CATALOG_my_dir.xlsx", "CATALOG_my_dir_1.xlsx"])
      ),
      "CATALOG_my_dir_2.xlsx"
    );

    assert.equal(
      c.get_unique_catalog_name("/home/me/my dir/", (existing_catalogs = [])),
      "CATALOG_my_dir.xlsx"
    );
    done();
  });
});



describe("Create a CATALOG", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup(); });
  after(function () { fixtures.teardown(); });

  it("Should create a catalog from scratch for test files", function() {
    this.timeout(15000);
    var c = new Collection();

    c.read(test_path, "./", false, 1000);
    var sheet_json = XLSX.utils.sheet_to_json(c.workbook.Sheets["Files"]);
    assert.equal(sheet_json[0]["FILE:Filename"], "1.pdf");

    fixtures.remove_test_file("1.pdf");
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    sheet_json = XLSX.utils.sheet_to_json(c.workbook.Sheets["Files"]);
    //console.log(sheet_json);
    // 1.pdf deleted but still in spreadsheet
    assert.equal(sheet_json[0]["FILE:Filename"], "1.pdf");
    assert.equal(sheet_json[0]["*MISSING-FILE*"], "1");

    return c.to_json_ld().then(
      function() {
        //console.log(JSON.stringify(c.json_ld, null, 2));
        assert.equal(c.item_by_id["./"]["hasPart"].length, 11);
        assert(!c.item_by_id["./1.pdf"]);
        assert(c.item_by_id["1.sh"]);
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Create MANY CATALOGS", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup(); });
  after(function () { fixtures.teardown(); });

  it("Should create appropriately named catalogs", function(done) {
    this.timeout(15000);
    shell.mkdir("-p", path.join(test_path, "a", "a", "a", "b"));
    shell.mkdir("-p", path.join(test_path, "b", "a", "a", "b"));
    console.log(test_path);
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    console.log(c.existing_catalogs);
    //console.log(shell.test('-e', path.join(test_path,"a","CATALOG_a.xlsx")))
    assert(shell.test("-e", path.join(test_path, "a", "CATALOG_a.xlsx")));
    assert(
      shell.test("-e", path.join(test_path, "a", "a", "CATALOG_a_1.xlsx"))
    );
    assert(
      shell.test("-e", path.join(test_path, "a", "a", "a", "CATALOG_a_2.xlsx"))
    );
    assert(
      shell.test("-e", path.join(test_path, "b", "a", "a", "CATALOG_a_4.xlsx"))
    );
    done();
  });
});


describe("Create SOME CATALOGS", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup(); });
  after(function () { fixtures.teardown(); });

  it("Should create appropriately named catalogs but only to a depth of two", function(done) {
    this.timeout(15000);
    shell.mkdir("-p", path.join(test_path, "a", "a", "a", "b"));
    shell.mkdir("-p", path.join(test_path, "b", "a", "a", "b"));
    var c = new Collection();
    c.read(test_path, "./", false, 3);
    //console.log(shell.test('-e', path.join(test_path,"a","CATALOG_a.xlsx")))
    assert(shell.test("-e", path.join(test_path, "a", "CATALOG_a.xlsx")));
    assert(
      shell.test("-e", path.join(test_path, "a", "a", "CATALOG_a_1.xlsx"))
    );
    assert(
      !shell.test("-e", path.join(test_path, "a", "a", "a", "CATALOG_a_2.xlsx"))
    );
    assert(
      !shell.test("-e", path.join(test_path, "b", "a", "a", "CATALOG_a_4.xlsx"))
    );
    done();
  });
});


describe("Create empty collection", function() {

  it("Should create an empty metadata set", function(done) {
    var c = new Collection();
    assert.deepEqual(c.collection_metadata.properties, {});
    assert.equal(c.children.length, 0);
    assert.equal(c.rel_path, "./");
    //assert(Object.is(c.collection_metadata, {} ));
    done();
  });
});


describe("GTM", function() {
  var test_path;

  before(function () { test_path = fixtures.buildup('GTM') });
  after(function() { fixtures.teardown('GTM') })

  it("Should create an non-empty metadata set", function() {
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    //console.log("Props", c.collection_metadata.properties);
    assert.equal(c.collection_metadata.properties["name"].data, "GTM");
    assert.equal(c.children.length, 0);
    //console.log(c.namy_dir_lookup);
    //console.log(c.things);
    //assert(Object.is(c.collection_metadata, {} ));

    return c.to_json_ld().then(
      function() {
        //console.log(JSON.stringify(c.json_ld, null, 2));
        assert.equal(c.item_by_url["./"]["hasPart"].length, 4);
        assert.equal(c.item_by_url["./"]["name"], "GTM");
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Glop Plot data", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup('Glop_Pot') });
  after(function() { fixtures.teardown('Glop_Pot') })

  it("Test basic metadata", function() {
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    assert.equal(
      c.collection_metadata.properties["name"].data,
      "Glop Pot data"
    );
    assert.equal(c.children.length, 3);
    //assert.equal(c.children[0].collection_metadata.properties["Description"].data, "NOT THIS");
    assert.equal(c.children[0].children.length, 0);

    return c.to_json_ld().then(
      function() {
        const items = c.item_by_id[
         "https://dx.doi.org/10.1016/this_is_an_example_not_a_real_DOI"
        ]["hasPart"];
        console.log(items);
        assert.equal(
          items.length,
          5, 
          "Expected 5 items in " + JSON.stringify(items)
        );
        assert.equal(c.item_by_url["sketchsheets"]["hasPart"].length, 3);
        //console.log("IDS", c.item_by_url["sketchsheets"]["hasPart"]);
        var a_file = c.item_by_id["sketchsheets/CP7Glopsketch01.jpg"];
        console.log("*** " + JSON.stringify(a_file));
        assert.equal(a_file.contentSize, "179640");
        assert.equal(a_file.encodingFormat, "JPEG File Interchange Format");
        assert.equal(
          a_file.fileFormat,
          "http://www.nationalarchives.gov.uk/PRONOM/fmt/43"
        );
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Glop Plot data - non recursive", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup('Glop_Pot') });
  after(function() { fixtures.teardown('Glop_Pot') })

  it("Test basic metadata for base directory only", function() {
    var c = new Collection();
    c.read(test_path, "./", false, 1);
    assert.equal(
      c.collection_metadata.properties["name"].data,
      "Glop Pot data"
    );
    // Did not recurse into directories
    assert.equal(c.children.length, 0);

    return c.to_json_ld().then(
      function() {
        //Still added parts for subdirs
        assert.equal(
          c.item_by_id[
            "https://dx.doi.org/10.1016/this_is_an_example_not_a_real_DOI"
          ]["hasPart"].length,
          5
        );
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Sample data details", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup('sample') });
  after(function() { fixtures.teardown('sample') })

  it("Should create an non-empty metadata set", function() {
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    //console.log(c.collection_metadata.properties);
    assert.equal(
      c.collection_metadata.properties["name"].data,
      "Sample dataset for DataCrate v0.2"
    );
    assert.equal(c.children.length, 2);
    //console.log(c.namy_dir_lookup);
    //console.log(c.things);
    //assert(Object.is(c.collection_metadata, {} ));
    return c.to_json_ld().then(
      function() {
        //console.log("JSON-LD", JSON.stringify(c.json_ld, null, 2));
        //console.log("JSON BY ID", c.item_by_id)
        //console.log(JSON.stringify(flattenated, null, 2));
        assert.equal(
          c.item_by_id["https://dx.doi.org/10.5281/zenodo.1009240"]["hasPart"]
            .length,
          2
        );
        assert.equal(
          c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"]
            .name,
          "Catalina Park"
        );
        //console.log("Place data", c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"])
        var catalina_location_id =
          c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"]
            .geo["@id"];
        var catalina_geo = c.item_by_id[catalina_location_id];
        assert.equal(catalina_geo.latitude, "-33.7152");
        assert.equal(catalina_geo.longitude, "150.30119");
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Sample data bagged", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup('sample') });
  after(function() { fixtures.teardown('sample') });

  it("Should create a bag", function() {
    var c = new Collection();
    c.read(test_path, "./", false, 1000);
    const bag_dir = path.join(working_dir, "bags", "sample");
    shell.rm("-rf", bag_dir);
    shell.mkdir("-p", bag_dir);
    c.bag(bag_dir);
    console.log(c.collection_metadata.properties);

    return c.to_json_ld().then(
      function() {
        //console.log("JSON-LD", JSON.stringify(c.json_ld, null, 2));
        c.generate_bag_info();
        c.save_bag_info();
        assert.equal(c.bag_meta["Contact-Email"], "pt@ptsefton.com", "email");
        assert(shell.test("-e", path.join(bag_dir, "CATALOG.json")));

        assert.equal(
          c.item_by_id["https://dx.doi.org/10.5281/zenodo.1009240"]["hasPart"]
            .length,
          2
        );

        assert.equal(
          c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"]
            .name,
          "Catalina Park"
        );
        //console.log("Place data", c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"])
        var catalina_location_id =
          c.item_by_id["http://www.geonames.org/8152662/catalina-park.html"]
            .geo["@id"];
        var catalina_geo = c.item_by_id[catalina_location_id];
        assert.equal(catalina_geo.latitude, "-33.7152");
        assert.equal(catalina_geo.longitude, "150.30119");
      },
      function(err) {
        console.log(err);
      }
    );
  });
});


describe("Datacite", function() {

  var test_path;

  before(function () { test_path = fixtures.buildup('Glop_Pot') });
  after(function() { fixtures.teardown('Glop_Pot') })

  it("Should create a data citation", function() {
    var c = new Collection();
    c.read(test_path);
    console.log(c.collection_metadata.properties);
    return c.to_json_ld().then(
      function() {
        citer = new Datacite();
        text_citation = citer.make_citation(
          path.join("../", test_path, "CATALOG.json"),
          path.join("./", test_path, "datacite.xml")
        );
        assert.equal(
          text_citation,
          "Lake, Mike; Vaughan-Taylor, Keir; Klocker, Andreas; Maynard, Phil (2017) Glop Pot data. Sydney University Speleological Society. Datacrate. https://dx.doi.org/10.1016/this_is_an_example_not_a_real_DOI"
        );
      },
      function(err) {
        console.log(err);
      }
    );
  });
});
