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

const shell = require("shelljs");
const builder = require("xmlbuilder");
const Index = require("../lib/index_html.js");
const default_test_dir = "test_output";
const Datacite = require("../lib/datacite.js");
const text_citation_1 =
  "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";
const assert = require("assert");

function set_up_a_dir(test_dir = default_test_dir) {
  // Set up a test directory with some files.
  shell.rm("-rf", test_dir);
  shell.mkdir("-p", test_dir);
  return test_dir;
}

describe("Test helper functions", function() {
  it("Test for path manipulation", function(done) {
    set_up_a_dir();
    var index_maker = new Index();

    // Single page version
    index_maker.init(
      "../test_data/sample_CATALOG.json",
      "./test/test_output/index.html",
      false
    );
    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240"),
      "#http://dx.doi.org/10.5281/zenodo.1009240"
    );

    // Multi page version
    index_maker.init(
      "../test_data/sample_CATALOG.json",
      "./test/test_output/index.html",
      true
    );


    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240", "http://dx.doi.org/10.5281/zenodo.1009240" ),
      "CATALOG.html"
    );

    assert.equal(
      index_maker.get_href("http://orcid.org/0000-0002-3545-944X", "http://dx.doi.org/10.5281/zenodo.1009240" ),
      "CATALOG_files/8998f8b4/885ba8f4/7d9b9bac/ef466c98/5d56f099/index.html"
    );


    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240", "http://orcid.org/0000-0002-3545-944X" ),
      "../../../../../../CATALOG.html"
    );

    assert.equal(
      index_maker.get_href("http://orcid.org/0000-0002-3545-944X", "http://n2t.info/urn:nbn:se:kb:repos-1" ),
      "../../../../../8998f8b4/885ba8f4/7d9b9bac/ef466c98/5d56f099/index.html"
    );

    assert.equal(
      index_maker.helper.item_by_id["http://orcid.org/0000-0002-3545-944X"][
        "@reverse"
      ]["creator"][0]["@id"],
      "http://dx.doi.org/10.5281/zenodo.1009240"
    );

    index_maker.init({
      "@graph": [
        {
          "@id": "https://dx.doi.org/10.4225/35/555d661071c76",
          name: "Farms to Freeways Example Dataset",
          path: ["data/"]
        }
      ]
    });

    /*
    citer = new Datacite();
    text_citation = citer.make_citation("./test_data/sample_CATALOG.json", "./test/test_output/sample_datacite.xml")

    index_maker.make_index_html(
                                "defaults/catalog_template.html",
                                text_citation);
    */
    //assert(Object.is(c.collection_metadata, {} ));

    // TODO - actual tests!!!!

    done();
  });
});
