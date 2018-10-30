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
const Datacite = require("../lib/datacite.js");
const assert = require("assert");
const default_test_dir = "test_output";
const text_citation_1 =
  "Peter Sefton (2017) Sample dataset for DataCrate v0.2. University of Technology Sydney. Datacrate. http://dx.doi.org/10.5281/zenodo.1009240";

function set_up_a_dir(test_dir = default_test_dir) {
  // Set up a test directory with some files.
  shell.rm("-rf", test_dir);
  shell.mkdir("-p", test_dir);
  return test_dir;
}


// This is really bad - but we have no proper test at the moment