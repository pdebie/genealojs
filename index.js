'use strict';

const fs = require('fs');
const _ = require('lodash');
const cytoscape = require('cytoscape');
const Graph = require('graphology');
const Graphsp = require('graphology-shortest-path');


let rawdata = fs.readFileSync('toto1.json');
let data = JSON.parse(rawdata);

console.log("\n-- init liste perso");

/* functions for gedcom parsing
 *
 */
function scanGedcomPerso(listAllPerso) {
  data.gedcomx.person.forEach(function (p) {
    // console.log('pmachin', p['@_id']);
    var a_perso = {};
    a_perso.id = p['@_id'];
    if (Array.isArray(p.name)) {
      p.name.forEach(function (n) {
        // console.log('name array');
        if (Array.isArray(n.nameForm)) {
          n.nameForm.forEach(function (nf) {
            a_perso.name = a_perso.name + " " + nf.fullText;
            console.log('full', nf.fullText);
          });
        }
        else {
          a_perso.name = a_perso.name + " " + n.nameForm.fullText;
        }

      });
    }
    else {
      try {
        a_perso.name = p.name.nameForm.fullText;
      }
      catch (error) {
        console.log('error')
        console.log(p.name.nameform)
      }
    }

    a_perso.ddn = '';
    a_perso.place = '';
    if (Array.isArray(p.fact)) {
      p.fact.forEach(function (f) {
        if (f["@_type"] == 'http://gedcomx.org/Birth' || f["@_type"] == 'http://gedcomx.org/Christening') {
          if (typeof f.date != "undefined") {
            if (typeof f.date.original != "undefined") {
              a_perso.ddn = f.date.original;
            }
          }
          if (typeof f.place != "undefined") {
            if (typeof f.place.original != "undefined") {
              a_perso.place = f.place.original;
            }
          }
        }
      });
    }
    a_perso.parents = findGedcomParents(a_perso.id);
    listAllPerso.push(a_perso);
  });
}

function findGedcomParents(_id) {
  var _parentres = _.filter(data.gedcomx.relationship, function (r) { return r.person2["@_resource"] == "#" + _id && r['@_type'] == 'http://gedcomx.org/ParentChild' });
  var _parent = [];
  _parentres.forEach(function (pa) {
    _parent.push(pa.person1["@_resource"].replace('#', ''));
  });
  return _parent;
}

/** Populate Cytoscape
 * 
 */
function populateCytoscape(_lp) {
  _lp.forEach(function (one_perso) {
    cy.add({ group: 'nodes', data: { id: one_perso.id } });
    graph.addNode(one_perso.id, { perso: one_perso.name } );
  });

  _lp.forEach(function (one_perso) {
    var parent = getParents([one_perso]);
    parent.forEach(function (pa) {
    try {
      cy.add({ group: 'edges', data: { id: one_perso.id + pa, source: one_perso.id, target: pa } });
      graph.addEdge(one_perso.id, pa);
    } catch (error) {
      console.error(error);
    }
    });
  });
}


/* functions for internal structure
 *
 */

function findPersoByID(_id, lp) {
  var resultarray = _.filter(lp, function (pp) { return pp.id == _id });
  return resultarray;
}

function findPersoByParentID(_id, lpap) {
  var resultarray = _.filter(lpap, function (pp) { return pp.parents.includes(_id) });
  return resultarray;
}


/* Return an array of id of parents */
function getParents(persoObjectArr) {
  var result = [];
  try {
    persoObjectArr.forEach(ra => ra.parents.forEach(pp => result.push(pp)));
  } catch (error) {
    console.log('Error getparent', persoObjectArr)
  }
  return result;
}

/** Return a formated string */
function formatPerso(persoObjectArr) {
  var result = '';
  persoObjectArr.forEach(ra => result = result + ra.name + ' ; ' + ra.ddn + ' ; ' + ra.place);
  return result;
}

/** Return an array of id of a generation */
function getParentsGeneration(listID, _lp, _lpap) {
  var allParents = [];

  listID.forEach(function (oneID) {
    var one_perso = findPersoByID(oneID, _lp);
    one_perso.forEach(op => _lpap.push(op));
    console.log('Personne;', oneID, ';', formatPerso(one_perso));

    // var parent = findGedcomParents(oneID);
    var parent = getParents(one_perso);
    parent.forEach(function (pa) {
      console.log('    ', pa, 'est', formatPerso(findPersoByID(pa, _lp)));
      allParents.push(pa);
    });
  });
  return allParents;
}

function savetoFile(fn, data) {
  var jsonData = JSON.stringify(data);
  fs.writeFile(fn, jsonData, function(err) {
    if (err) {
        console.log(err);
    }
  });
}

/** *********************************************************
 *         main 
 */
const generationNumber = 33;
var listAllPerso = [];
var listParentedPerso = [];
scanGedcomPerso(listAllPerso);
// console.log(listAllPerso);
savetoFile('listAllPerso.txt', listAllPerso);


var generation = ['I6472'];
for (let i = 1; i <= generationNumber; i++) {
  console.log("\n-- Generation:", i, 'Nombre:', generation.length, 'Attendu', Math.pow(2, i - 1));
  generation = getParentsGeneration(generation, listAllPerso, listParentedPerso);
}

console.log("\n-- listParentedPerso");

// console.log(listParentedPerso);
savetoFile('listParentedPerso.txt', listParentedPerso);


console.time("populateCytoscape");
console.timeLog("populateCytoscape");

var cy = cytoscape({});
const graph = new Graph();

/*
graph.addNode('a');
graph.addNode('b');
graph.addNode('c');
graph.addEdge('a', 'b');
graph.addEdge('b', 'c');
const pathtest = Graphsp.dijkstra.bidirectional(graph, 'a', 'c');
console.log('dfgdgdgfdfgfd');
console.log(pathtest);
*/

populateCytoscape(listAllPerso);

console.timeEnd('populateCytoscape');

// var aStar = cy.elements().aStar({ root: 'I6472', goal: 'I4010' });
// console.log(aStar.path.select());
// console.log(aStar);
// console.log(aStar.path.nodes());
console.log('Number of nodes', graph.order);
console.log('Number of edges', graph.size);
savetoFile('graph.export.txt', graph.export());

const lignee_requete = [ 
  { indi: 'I6472', ancetre: 'I80140'},
  { indi: 'I6472', ancetre: 'I65279'},
  { indi: 'I6472', ancetre: 'I65424'},
  { indi: 'I6472', ancetre: 'I66342'}
];

lignee_requete.forEach(element => {
  console.log('\n-- Lignée', element.indi, element.ancetre);
  var path = Graphsp.dijkstra.bidirectional(graph, element.indi, element.ancetre); // 'I6472', 'I80140'); // 'I82986'); // I65065
  // console.log(path);
  path.forEach(element => {
    console.log(formatPerso(findPersoByID(element, listAllPerso)));
  });
});



/* console.log("\n-- Ancetre");


var ancetre = 'I4010'; // 'I68243'; // 'I78246';
var children = findPersoByParentID(ancetre, listParentedPerso);
console.log(children);
while (children.length > 0) {
  children.forEach(function(child){

  });
  console.log('Ancetre;', ';', formatPerso(children));
  children = findPersoByParentID(children.id, listParentedPerso);
  console.log(children);
}

*/
