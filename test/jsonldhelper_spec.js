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

const fs = require("fs");
const jsonld = require("../lib/jsonldhelper.js");
const path = require("path");
const assert = require("assert");

const fixtures = require("./fixtures");


describe("JSON-LD helper simple tests", function () {

  var test_path;

  before(function () { test_path = fixtures.buildup('context_trimming'); });
  after(function () { fixtures.teardown('context_trimming'); });




  it("Test context resolving", function (done) {

    // From the spec https://json-ld.org/spec/latest/json-ld/
    var json_content = {
      "@context": {
        "name": "http://schema.org/name",
        "image": {
          "@id": "http://schema.org/image",
          "@type": "@id"
        },
        "homepage": {
          "@id": "http://schema.org/url",
          "@type": "@id"
        }
      },
      "@graph": [
        {
          "name": "Manu Sporny",
          "homepage": "http://manu.sporny.org/",
          "image": "http://manu.sporny.org/images/manu.png"
        }
      ]
    }
    const helper = new jsonld()
    helper.init(json_content)
    assert(helper.get_uri_for_term("name"), "http://schema.org/name")
    assert(helper.get_uri_for_term("image"), "http://schema.org/image")

    helper.trim_context()
    assert.equal(Object.keys(helper.json_ld["@context"]).length, 3)

    //from the spec - example 24
    json_content = {
      "@graph": [
        {
          "@id": "http://me.markus-lanthaler.com/",
          "@type": "foaf:Person",
          "foaf:name": "Markus Lanthaler",
          "foaf:homepage": "http://www.markus-lanthaler.com/",
          "picture": "http://twitter.com/account/profile_image/markuslanthaler"
        }],
      "@context": {
        "@version": 1.1,
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "foaf": "http://xmlns.com/foaf/0.1/",
        "foaf:homepage": { "@type": "@id" },
        "picture": { "@id": "foaf:depiction", "@type": "@id" }
      }
    }
    
    const helper2 = new jsonld()
    helper2.init(json_content)
    console.log("Looking up name", helper2.get_uri_for_term("foaf:name"))
    assert.equal(helper2.get_uri_for_term("foaf:name"), "http://xmlns.com/foaf/0.1/name")
    assert.equal(helper2.get_uri_for_term("picture"), "http://xmlns.com/foaf/0.1/depiction")
    assert.equal(helper2.get_uri_for_term("foaf:homepage"), "http://xmlns.com/foaf/0.1/homepage")
    assert.equal(helper2.get_uri_for_term("foaf:Person"), "http://xmlns.com/foaf/0.1/Person")
    helper2.trim_context()
    assert.equal(Object.keys(helper2.json_ld["@context"]).length, 4)

    // Try with a real CATALOG
    var catalog = path.join(test_path, 'CATALOG.json');
    json_content = JSON.parse(fs.readFileSync(catalog));
    const helper3 = new jsonld()
    helper3.init(json_content)
    assert.equal(helper3.get_uri_for_term("Person"), "http://schema.org/Person")
    assert.equal(helper3.get_uri_for_term("Project"), "http://purl.org/cerif/frapo/Project")
    helper3.trim_context()
    assert.equal(Object.keys(helper3.json_ld["@context"]).length, 29)


     // Test context trimming
     const json4 = {
      "@graph": [
        {
          "@id": "1", "name": "one", "path": "./nothing", "@type": "Dataset",
          "distibution": [{ "@id": "2" }]
        },
        { "@id": "2", "name": "two", "path": "./something", "@type": "DataDownload" },
      ]
    }
    
    helper.init(json4)
    helper.trim_context()
    assert.equal(helper.get_uri_for_term("DataDownload"), "http://schema.org/DataDownload");


    done();
    
  });




  it("Test basic indexing", function (done) {
    const json = {
      "@graph": [
        { "@id": "1", "name": "one", "path": "./nothing", "@type": "Test" }
      ]
    }
    var helper = new jsonld()
    helper.init(json)
    assert.equal(
      helper.item_by_id["1"]["name"], "one"
    );
    assert.equal(
      helper.item_by_url["./nothing"]["name"], "one"
    );
    assert.equal(
      helper.item_by_type["Test"][0]["name"], "one"
    );

    assert.equal(
      helper.item_by_type["Test"].length, 1
    );

  
    const json1 = {
      "@graph": [
        {
          "@id": "1", "name": "one", "path": "./nothing", "@type": "Test",
          "hasPart": [{ "@id": "2" }, { "@id": "3" }, { "@id": "4" }], "creator": { "@id": "2" }
        },
        { "@id": "2", "name": "two", "path": "./something", "@type": "Test" },
        { "@id": "3", "name": "three", "path": "./somethin_else", "@type": "Test1" },
        { "@id": "4", "name": "four", "path": "./nothin", "@type": "Test1" }
      ]
    }
   
    helper = new jsonld()
    helper.init(json1)
    assert.equal(
      helper.item_by_id["1"]["name"], "one"
    );
    assert.equal(
      helper.item_by_url["./something"]["name"], "two"
    );
    assert.equal(
      helper.item_by_type["Test"].length, 2
    );
    for (let part of helper.value_as_array(helper.item_by_id["1"]["hasPart"])) {
      assert.equal(helper.reference_to_item(part)["path"].startsWith("./"), true)
    }

    // Check that inverse links have been put in place
    helper.add_back_links()
    assert.equal(helper.item_by_id["2"]["isPartOf"][0]["@id"], "1")
    assert.equal(helper.item_by_id["3"]["isPartOf"][0]["@id"], "1")
    assert.equal(helper.item_by_id["4"]["isPartOf"][0]["@id"], "1")
    assert.equal(helper.item_by_id["2"]["@reverse"]["creator"][0]["@id"], "1")
    
    assert.equal(helper.get_uri_for_term("isPartOf", "http://schema.org/isPartOf"))

    


    
   

    done();
  });
});
