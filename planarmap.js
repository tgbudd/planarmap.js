var CMap = CMap || {};

var CMap.Face = function (){
	this.edges = [];
	this.attr = {};
}

CMap.Face.prototype.forEachEdge = function(f){
	var nEdges = this.edges.length;
	for(var i=0;i<nEdges;i++)
	{
		f(this.edges[i],i);
	}
}
CMap.Face.prototype.forEachLink = function(f){
	var nEdges = this.edges.length;
	for(var i=0;i<nEdges;i++)
	{
		this.edges[i].links.forEach
	}
}

CMap.PlanarMap = function (){
	var planarmap = {}; // Object which is returned
	var nodes = [];		// Array of nodes (including auxiliary)
	var edges = [];		// Array of (combinatorial) edges, each of which may be comprised of several links
	var links = [];		// Array of links, containing pairs of node-id's
	var faces = [];
	var outerfaceIndex; // Gives id of infinite face 

	function emptyNodes(){
		while(nodes.length > 0)
		{
			nodes.pop();
		}
	}
	function emptyLinks(){
		while(links.length > 0)
		{
			links.pop();
		}
	}
	function emptyFaces(){
		while(faces.length > 0)
		{
			faces.pop();
		}
	}
	
	planarmap.nodes = function(){
		return nodes;
	}
	planarmap.links = function(){
		return links;
	}
	planarmap.edges = function(){
		return edges;
	}
	planarmap.faces = function(){
		return faces;
	}
	planarmap.outerface = function(){
		return faces[outerfaceIndex];
	}
	planarmap.singleEdgeMap = function(){
		emptyNodes();
		emptyLinks();
		emptyFaces();
		nodes.push({pos: new Vec2(0.5,-0.5), attr: {}});
		nodes.push({pos: new Vec2(-0.5,0.5), attr: {}});
		links.push({nodes: [0,1], attr: {}});
		edges.push({links: [], attr: {});
		faces.push({edges: [{id:0, ccw: true},{id:0, ccw: false}], outer: true});
		return planarmap;
	}
	planarmap.forEachLinkInFace = function(face,fun){
		face.edges.forEach(function(edge){
			var numlinks = edges[edge.id].links.length;
			for(var i=0;i<numlinks;i++)
			{
				fun(links[edges[edge.id].links[i]],edge.ccw);
			}
		}
		return planarmap;
	}
	return planarmap;
};
