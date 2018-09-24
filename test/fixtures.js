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

/* helper functions for building and tearing down text fixtures */

const shell = require("shelljs");
const fs = require("fs");
const path = require("path");


test_dir = "test_data";
fixtures_dir = path.join(test_dir, "fixtures");
working_dir = path.join(test_dir, "working");

default_test_dir = path.join(working_dir, "test_dir");

function buildup (fixture=undefined) {
 	// Set up a test directory with some files.
 	if( fixture ) {
 		return buildup_fixture(fixture);
 	}
 	const test_dir = default_test_dir;
 	shell.rm("-rf", test_dir);
 	shell.mkdir("-p", test_dir);
 	["1", "two", "three file", "2 times 2"].forEach(function(f) {
 		[".txt", ".pdf", ".sh"].forEach(function(e) {
 			fs.writeFileSync(path.join(test_dir, f + e));
 		});
 	});
 	return test_dir;
}

function buildup_fixture(fixture) {
  const src = path.join(fixtures_dir, fixture);
  const dest = path.join(working_dir, fixture);
  shell.rm("-rf", dest);
  shell.cp("-r", src, dest);
  return dest;
}


function teardown(fixture=undefined) {
	if( fixture ) {
	  shell.rm("-rf", path.join(working_dir, fixture));
	} else {
 		shell.rm("-rf", default_test_dir);
 	}
}


function remove_test_file(f, test_dir = default_test_dir) {
  shell.rm("-rf", path.join(test_dir, f));
}




module.exports = {
	buildup: buildup,
	teardown: teardown,
	remove_test_file: remove_test_file
};
