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

const builder = require("xmlbuilder");
const path = require("path");
const fs = require("fs-extra");
const defaults = require("../lib/defaults.js");
const Index = require("../lib/index_html.js");
const Datacite = require("../lib/datacite.js");
const chai = require("chai");
chai.use(require("chai-fs"));
const expect = chai.expect;


const DEFAULT_TEST_DIR = "test_output";
const SAMPLE_DIR = path.join(DEFAULT_TEST_DIR, "sample_multi");
const SAMPLE_CATALOG = "test_data/sample_CATALOG.json";
const text_citation_1 =
  "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";
const assert = require("assert");

describe("Test sync creation of multi-file html", function() {

  before(async function() {
    await fs.remove(DEFAULT_TEST_DIR);
    await fs.ensureDir(DEFAULT_TEST_DIR);
    await fs.ensureDir(SAMPLE_DIR);
    await fs.copy(SAMPLE_CATALOG, path.join(SAMPLE_DIR, 'CATALOG.json'));
  })


    // Multi page version
    index_maker.init(
      "../test_data/sample_CATALOG.json",
      "./test/test_output/index.html",
      true
    );





});

describe("Test async creation of single CATALOG.html", function() {

  before(async function() {
    await fs.remove(DEFAULT_TEST_DIR);
    await fs.ensureDir(DEFAULT_TEST_DIR);
  })


  it("Can generate a single-page CATALOG.html", async function() {
    var index_maker = new Index();

    var template_ejs = await fs.readFile(defaults.catalog_template);
    var catalog_json = await fs.readJson(SAMPLE_CATALOG);

    index_maker.init_pure({
      catalog_json: catalog_json,
      template: template_ejs,
      multiple_files: false
    });

    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240"),
      "#http://dx.doi.org/10.5281/zenodo.1009240"
    );


  });
});




describe("Test async creation of CATALOG.html", function() {

  before(async function() {
    await fs.remove(DEFAULT_TEST_DIR);
    await fs.ensureDir(DEFAULT_TEST_DIR);
  })


  it("Can generate a single-page CATALOG.html", async function() {
    var index_maker = new Index();

    var template_ejs = await fs.readFile(defaults.catalog_template);
    var catalog_json = await fs.readJson(SAMPLE_CATALOG);

    index_maker.init_pure({
      catalog_json: catalog_json,
      template: template_ejs,
      multiple_files: false
    });

    assert.equal(
      index_maker.get_href("http://dx.doi.org/10.5281/zenodo.1009240"),
      "#http://dx.doi.org/10.5281/zenodo.1009240"
    );


  });
});
