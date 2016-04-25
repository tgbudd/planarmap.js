#TODO

## General

* Support the inverse of an edge split, i.e. the removal of a vertex of 
degree two.
* Support fixing the layout of an edge, including the Auxiliary vertices.
* Implement (constrained) Delaunay triangulation of faces, and explore
possibility of basing an alternative force layout on this.
* Improve marker support, including the option of having the color adjust
to edge stroke color.
* New "cross" display style of nodes: if node, say of degree four, is 
marked as "cross", display the edges such that opposite edges are collinear,
and suppress node display. In this way the node looks simply like an intersection
of two edges, e.g. in the case of dual map display.


## Editor

* Let the user choose filename for SVG/JSON download. 
* Edit bounding box: allow users to set bounding box to automatic, or to be
chosen by hand. Include checkbox to display bounding box.
* When selecting a planar map component: make the color pickers, and other
properties of component, to auto update.
* Change color selection in color picker, and keep track of color history.

