
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

const Item = require("../lib/item.js");
const assert = require("assert");
const Collection = require("../lib/collection.js");

describe("Create empty item", function() {
  it("Should create an empty metadata set", function(done) {
    var item = new Item();
    assert.deepEqual(item.metadata, {});
    //assert(Object.is(c.collection_metadata, {} ));

    done();
  });
});

//  f.parse("Creator>TYPE:Person>", "Name: Peter Sefton, ID: http://orcid.org/0000-0002-3545-944X");

describe("Create nested item", function() {
  it("Should create an empty metadata set", function(done) {
    var t1 = new Item();
    t1.load_json(
      {
        "Creator>TYPE:Person>":
          "Name: Peter Sefton, ID: http://orcid.org/0000-0002-3545-944X",
        "TYPE:": "Dataset",
        Description: "Test data"
      },
      new Collection()
    );
    assert.equal(t1.types[0], "Dataset");
    assert.equal(t1.properties["description"].data[0], "Test data");
    assert.equal(
      t1.collection.name_lookup["Peter Sefton"].id,
      "http://orcid.org/0000-0002-3545-944X"
    );
    assert.equal(t1.nested_items["creator"].types[0], "Person");
    assert.equal(t1.nested_items["creator"].name, "Peter Sefton");
    assert.equal(
      t1.nested_items["creator"].id,
      "http://orcid.org/0000-0002-3545-944X"
    );

    //console.log("item with other item in it ...", t);

    //console.log("Nested JSON", t1.to_json_ld_fragment());
    j1 = t1.to_json_ld_fragment();
    assert.equal(j1["creator"]["@type"][0], "Person");
    assert.equal(j1["creator"]["name"], "Peter Sefton");
    assert.equal(j1["creator"]["@id"], "http://orcid.org/0000-0002-3545-944X");
    //assert(Object.is(c.collection_metadata, {} ));

    t1.load_json(
      {
        "contactPoint>TYPE:ContactPoint>":
          "Email: someone@somewhere.com"
      },
      new Collection()
    );

    assert.equal(t1.nested_items["contactPoint"].types[0], "ContactPoint");
    assert.equal(
      t1.nested_items["contactPoint"].name,
      "Email: someone@somewhere.com"
    );
    j1 = t1.to_json_ld_fragment();
    assert.equal(j1["contactPoint"]["@type"][0], "ContactPoint");
    assert.equal(j1["contactPoint"]["email"], "someone@somewhere.com");


    t1.load_json(
      {
        "geo>TYPE:GeoCoordinates>":
          "Latitude: -35.623592, Longitude: 148.683836"
      },
      new Collection()
    );

    assert.equal(t1.nested_items["geo"].types[0], "GeoCoordinates");
    assert.equal(
      t1.nested_items["geo"].name,
      "Latitude: -35.623592, Longitude: 148.683836"
    );
    j1 = t1.to_json_ld_fragment();
    assert.equal(j1["geo"]["@type"][0], "GeoCoordinates");
    assert.equal(j1["geo"]["latitude"], "-35.623592");
    assert.equal(j1["geo"]["longitude"], "148.683836");

    done();
  });
});

describe("Create simple item", function() {
  it("Should create an empty metadata set", function(done) {
    var t1 = new Item();
    t1.load_json(
      {
        ID: "http://orcid.org/0000-0003-4953-0830",
        Name: "Mike Lake",
        GivenName: "Mike",
        FamilyName: "Lake",
        "TYPE:": "Person",
        Email: "mike.lake@uts.edu.au"
      },
      new Collection()
    );
    assert.equal(t1.id, "http://orcid.org/0000-0003-4953-0830");
    assert.equal(t1.name, "Mike Lake");
    assert.equal(t1.collection.name_lookup["Mike Lake"].name, "Mike Lake");
    assert.equal(
      t1.collection.id_lookup["http://orcid.org/0000-0003-4953-0830"].name,
      "Mike Lake"
    );
    //console.log(t1.to_json_ld_fragment());

    var t = new Item();
    t.load_json(
      {
        "FILE:Filename": "CP7Glopsketch01.jpg",
        Description: "Downstream from sump 2 to sump 1",
        "RELATION:Creator*": "Phil Maynard, Andreas Klocker, Mike Lake",
        License: "CC-BY"
      },
      t1.collection // Reference Mike as creator
    );
    assert.equal(t.id, "CP7Glopsketch01.jpg");
    //assert.deepEqual(t.metadata, {} );
    //assert(Object.is(c.collection_metadata, {} ));
    //console.log(t.to_json_ld_fragment());

    var t2 = new Item();
    t2.load_json(
      {
        ID: "glop_pot",
        Name: "Glop Pot",
        Description:
          "Located in the Snowy Mountains Region of NSW, nearest town Tumut 2720",
        "TYPE:": "Place",
        Address: "Cooleman Plains",
        "                 geo>TYPE:GeoCoordinates>":
          "Latitude: -35.623592, Longitude: 148.683836"
      },
      new Collection()
    );
    assert.equal(t2.types[0], "Place");

    done();
  });
});
