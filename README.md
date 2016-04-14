# Planarmap.js

Planamap.js is a (very preliminary) javascript library that allows 
for easy interaction with planar maps (= embedded planar graphs) in
the browser. It allows users/scripts to change the combinatorics of 
a planar map, while the embedding is automatically updated using a 
force-driven layout algorithm.

Check out some examples here:
* Peeling process of a uniform infinite planar triangulation: 
(http://www.nbi.dk/~budd/planarmap/examples/peeling.html)
* Schaeffer's bijection between labeled trees and quadrangulations:
(http://www.nbi.dk/~budd/planarmap/examples/schaefferbijection.html)

However, so far the main application is a planar map editor, which 
allows loading and saving of planar maps in SVG or JSON format. Try the
editor here: (http://www.nbi.dk/~budd/planarmap/examples/editor.html)

Any comments, suggestions, contributions are more than welcome.

## Dependencies

* [d3.js](http://d3js.org): Planarmap.js was modeled in the spirit of D3.js and
D3.js is used to interact with the DOM.

The editor currently relies on:
* [SVG Crowbar](https://github.com/NYTimes/svg-crowbar): Allows saving to
SVG, e.g. for editing in [Inkscape](inkscape.org).
* [mcColorPicker](http://www.menucool.com/color-picker): color picker
* [css-toggle-switch](https://github.com/ghinda/css-toggle-switch): toggle switch

## License

MIT license: free to reuse. If used in an academic context, attribution
(to [Timothy Budd](http://www.nbi.dk/~budd/)) would be appreciated but is not 
mandatory.
