# Planarmap.js

Planamap.js is a (very preliminary) javascript library that allows 
for easy interaction with planar maps (= embedded planar graphs) in
the browser. It allows users/scripts to change the combinatorics of 
a planar map, while the embedding is automatically updated using a 
force-driven layout algorithm.

Check out some examples here:
* Peeling process of a uniform infinite planar triangulation: 
(www.nbi.dk/~budd/planarmap/examples/peeling.html)
* Schaeffer's bijection between labeled trees and quadrangulations:
(www.nbi.dk/~budd/planarmap/examples/schaefferbijection.html)

Any comments, suggestions, contributions are more than welcome.

## Dependencies

* [d3.js](d3js.org): Planarmap.js was modeled in the spirit of D3.js and
D3.js is used to interact with the DOM.
* [SVG Crowbar](https://github.com/NYTimes/svg-crowbar): Allows saving to
SVG, e.g. for editing in [Inkscape](inkscape.org).

## License

MIT license: do whatever you like. However, if used in a scientific 
publication, please provide proper attribution.
