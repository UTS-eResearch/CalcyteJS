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


const TEST_OUTPUT_DIR = "test_output";
const OUTPUT_DIR = path.join(TEST_OUTPUT_DIR, "output");
const OUTPUT_DIR_CMP = path.join(TEST_OUTPUT_DIR, "output_cmp");
const SAMPLE_CATALOG = "test_data/sample_CATALOG.json";
const FIXTURE = "test_data/fixtures/sample_html";
const TIMESTAMP = '2019-05-16T03:09:09.518Z';
const text_citation_1 =
  "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";
const assert = require("assert");

describe("Sync creation of multi-file html", function() {

  before(async function() {
    await fs.remove(TEST_OUTPUT_DIR);
    await fs.ensureDir(TEST_OUTPUT_DIR);
    await fs.ensureDir(OUTPUT_DIR);
    await fs.copy(SAMPLE_CATALOG, path.join(OUTPUT_DIR, 'CATALOG.json'));
  })



  it("Can synchronously create multi-page CATALOG.html file structure", function() {
    const index_maker = new Index();


    index_maker.init({
      catalog_json: path.join("..", SAMPLE_CATALOG),
      out_dir: OUTPUT_DIR,
      multiple_files: true,
      force_timestamp: TIMESTAMP,
      force_json_timestamp: TIMESTAMP
    });

    expect(index_maker.html_file_name).to.equal(defaults.html_file_name);

    // this is sync

    index_maker.make_index_html(
      text_citation_1, "zip_path"
    );

    // this doesn't test the contents, just the structure

    expect(OUTPUT_DIR).to.be.a.directory("is a dir").and.deep.equal(FIXTURE, "directory structure matches fixture");


  });

});


it.skip("Can synchronously create multi-page CATALOG.html file contents", function() {
    var index_maker = new Index();

    index_maker.init({
      catalog_json: path.join("..", SAMPLE_CATALOG),
      out_dir: OUTPUT_DIR,
      multiple_files: true,
      force_timestamp: TIMESTAMP,
      force_json_timestamp: TIMESTAMP
    });

    expect(index_maker.html_file_name).to.equal(defaults.html_file_name);

    // this is sync

    index_maker.make_index_html(
      text_citation_1, "zip_path"
    );


    expect(OUTPUT_DIR).to.be.a.directory("is a dir").with.deep.files.that.satisfy((files) => {
      return files.every((file) => {
        const fixture_file = path.join(FIXTURE, file);
        const output_file = path.join(OUTPUT_DIR, file);
        if ( file !== 'CATALOG.html' ) {
          expect(output_file).to.be.a.file(`file ${output_file}`).and.equal(fixture_file, `${output_file} content matches`);
        }
        return true;
      })
    })
});


// Notes on the async tests: 
// create one CATALOG_files with the sync method, create one from the same JSON with the async
// methods, and then use the 'deep.files.that.satisfy' technique above to ensure that they are the
// same




describe("Async creation of multi-file html", function() {

  before(async function() {
    await fs.remove(TEST_OUTPUT_DIR);
    await fs.ensureDir(TEST_OUTPUT_DIR);
    await fs.ensureDir(OUTPUT_DIR);
    await fs.ensureDir(OUTPUT_DIR_CMP);
    await fs.copy(SAMPLE_CATALOG, path.join(OUTPUT_DIR, 'CATALOG.json'));
    await fs.copy(SAMPLE_CATALOG, path.join(OUTPUT_DIR_CMP, 'CATALOG.json'));
  })


  it("Can asynchronously create multi-page CATALOG.html file structure", async function() {
    const index = new Index();
    const index_sync = new Index();

    const catalog_json = await fs.readJson(SAMPLE_CATALOG);


    index.init_pure({
      catalog_json: catalog_json,
      multiple_files: true,
      force_timestamp: TIMESTAMP,
      json_timestamp: TIMESTAMP
    });

    await index.load_template();


    const pages = index.make_index_pure(text_citation_1, "zip_path");

    for( page of pages ) {
      const p = path.join(OUTPUT_DIR, page.path);
      await fs.ensureDir(p);
      const file = path.join(p, index.html_file_name);
      await fs.writeFile(file, page.html)
    };

    // make a sync one to compare it with

    index_sync.init({
      catalog_json: path.join("..", SAMPLE_CATALOG),
      out_dir: OUTPUT_DIR_CMP,
      multiple_files: true,
      force_timestamp: TIMESTAMP,
      force_json_timestamp: TIMESTAMP
    });

    // this is sync

    index_sync.make_index_html(
      text_citation_1, "zip_path"
    );


    expect(OUTPUT_DIR).to.be.a.directory("is a dir").and.deep.equal(FIXTURE, "directory structure matches fixture");

    expect(OUTPUT_DIR).to.be.a.directory("is a dir").with.deep.files.that.satisfy((files) => {
      return files.every((file) => {
        const fixture_file = path.join(OUTPUT_DIR_CMP, file);
        const output_file = path.join(OUTPUT_DIR, file);
        if ( file !== 'CATALOG.html' ) {
          expect(output_file).to.be.a.file(`file ${output_file}`).and.equal(fixture_file, `${output_file} content matches`);
        }
        return true;
      })
    })







  });
});
