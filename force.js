function defaultFor(arg, val) { return typeof arg !== 'undefined' ? arg : val; }

var CMap = CMap || {};

CMap.force = function (map){
	var force = {};
	var event = d3.dispatch("start","tick","end");
	//var drag;
	var planarmap = map;
	var repulsionPower = 1.0;
	var springLength = 1.0;
	var springCoupling = 2.0;
	var controlParam = 0.4;
	var dragforce = {drag: false, coupling: 10};
	var running = false;
	var centerPull = {pull: false, center: new Vec2(0,0), coupling: 3};
	
	force.repulsionPower = function(x) {
		if (!arguments.length) return repulsionPower;
		repulsionPower = x;
		return force;
	}; 	
	force.springLength = function(x) {
		if (!arguments.length) return springLength;
		springLength = x;
		return force;
	}; 	
	force.springCoupling = function(x) {
		if (!arguments.length) return springCoupling;
		springCoupling = x;
		return force;
	};
	force.dragforce = function(x) {
		if (!arguments.length) return dragforce;
		dragforce = x;
		return force;	
	}; 	
	force.centerPull = function(x) {
		if (!arguments.length) return centerPull;
		centerPull = x;
		return force;	
	};
	force.energy = function(calcForce) {
		calcForce = defaultFor(calcForce,false);
		if( calcForce )
		{
			planarmap.nodes().forEach(function(n){
				if( force in n )
				{
					n.force.x = 0;
					n.force.y = 0;
				} else
				{
					n.force = new Vec2(0,0);
				}
			});
		}
		
		var energy = 0;
		energy += repulsionForce(calcForce);
		energy += springForce(calcForce);
		energy += centerPullForce(calcForce);
		energy += dragForce(calcForce);
    	return energy;
	};
	function dragForce(calcForce) {
		if( !dragforce.drag )
		{
			return 0;
		}
		var radial = dragforce.cursor.minus(dragforce.node.pos);
		if( calcForce )
		{
			dragforce.node.force.addVec(radial.copy().mult(dragforce.coupling));
		}
		return 0.5*radial.normSq()*dragforce.coupling;
	}
	function repulsionForce(calcForce) {
		return planarmap.faces().total(function(f){
			return repulsionForceFace(f,calcForce);
		});
	}
	function repulsionForceFace(face,calcForce) {
		var energy = 0;
		face.edges.forEach(function(edge1,i1){
			face.edges.forEach(function(edge2,i2){
				energy += repulsionForceEdgeEdge(edge1,edge2,calcForce);
			})
		});
		return energy;
	}
	function repulsionForceEdgeEdge(edge1,edge2,calcForce)
	{
		var energy = 0;
		var vert1 = CMap.getVerticesOnEdge(edge1,true,false);
		var vert2 = CMap.getVerticesOnEdge(edge2,true,true);
		var strength = 1;
		if( "relRepulsionStrength" in edge1.edge.layout )
		{
			strength *= edge1.layout.relRepulsionStrength;
		}
		if( "relRepulsionStrength" in edge2.edge.layout )
		{
			strength *= edge2.layout.relRepulsionStrength;
		}
		vert1.forEach(function(v){
			for( var i = 0;i<vert2.length-1;i++)
			{
				energy += repulsionForceNodeLink(v,[vert2[i],vert2[i+1]],strength,calcForce)
			}		
		});
		return energy;
	}
	function repulsionForceNodeLink(n,l,strength,calcForce)
	{
		if( n == l[0] || n == l[1] )
		{
			return 0;
		}
		var distdiff = ( n.pos.distance(l[0].pos)
					   + n.pos.distance(l[1].pos)
					   - l[0].pos.distance(l[1].pos) );
		var energy = strength * Math.pow(distdiff/springLength,-repulsionPower);
		if( calcForce )
		{
			var scale = repulsionPower * energy / distdiff;
			var lton = [ n.pos.minus(l[0].pos).normalize(),
						 n.pos.minus(l[1].pos).normalize() ];
			var l0tol1 = l[1].pos.minus(l[0]).normalize();
			n.force.addVec( lton[0].plus(lton[1]).mult(scale) );
			l[0].force.subVec( lton[0].minus(l0tol1).mult(scale) );
			l[1].force.subVec( lton[1].plus(l0tol1).mult(scale) );
		}
		return energy;
	}
	function springForce(calcForce) {
		return planarmap.edges().total(function(e){
				return springForceEdge(e,calcForce);
			});
	}
	function springForceEdge(edge,calcForce) {
		var vert = CMap.getVerticesOnEdge(edge.getOriented(),true,true);
		var length = 0;
		for(var i=0;i<vert.length-1;i++)
		{
			length += vert[i].pos.distance(vert[i+1].pos);
		}
		var targetlength = springLength;
		if( "relSpringLength" in edge.layout )
		{
			targetlength *= edge.layout.relSpringLength;
		}
		length -= targetlength;
		if( calcForce )
		{
			for(var i=0;i<vert.length-1;i++)
			{
				var forcevec = vert[i+1].pos.minus(vert[i].pos).normalize()
					.mult(springCoupling*length);
				vert[i].force.addVec(forcevec);
				vert[i+1].force.subVec(forcevec);
			}
		}
		return 0.5 * springCoupling * length * length
	}
	function centerPullForce(calcForce) {
		if( !centerPull.pull )
		{
			return 0;
		}
		var energy = planarmap.nodes().total(function(n){
			return centerPullForceVertex(n,calcForce);
		})
		CMap.getAuxiliaryVertices(planarmap).forEach(function(v){
			energy += centerPullForceVertex(v,calcForce);
		})
		return energy;
	}
	function centerPullForceVertex(v,calcForce)
	{
		var radial = v.pos.minus(centerPull.center)
			.mult(centerPull.coupling);
		if( calcForce )
		{
			v.force.subVec(radial);
		}
		return 0.5*radial.normSq()/centerPull.coupling
	}
	force.tick = function() {
		if( !running )
		{
			return true;
		}
    	    	
    	var stepsize = 0.004;
    	
    	// Accumulate force and calculate energy
    	var energy = force.energy(true);
    	var gradSq = 0;
    	var maxForce = 0;
		planarmap.nodes().forEach(function(n){
			n.oldpos = n.pos.copy();
			gradSq += n.force.normSq();
			maxForce=Math.max(maxForce,n.force.normSq());
		});
		maxForce = Math.sqrt(maxForce);
		if( maxForce > 0 )
		{
			stepsize = Math.min(stepsize,0.1/maxForce);
		}
		if( gradSq / planarmap.numNodes() < 0.002 )
		{
			force.stop();
			return true;
		} else
		{
			var done = false;
			var maxsteps = 50;
			while( maxsteps > 0 && !done ) {
				planarmap.nodes().forEach(function(n){
					n.pos = n.oldpos.copy().addVec(n.force.copy().mult(stepsize));
				});
				if( CMap.planarMapIsNonSimple(planarmap) )
				{
					stepsize *= 0.5;
					console.log("nonsimple");
				} else
				{
					var newenergy = force.energy(false);
					//console.log(energy - newenergy, stepsize * gradSq);
					if( energy - newenergy > controlParam * stepsize * gradSq )
					{
						done = true;
					} else
					{	
						stepsize *= 0.5;
						maxsteps--;
					}
				}
			}
		}
    	event.tick({type: "tick"});
    	
    	return false;
  	};
  	
    force.start = function() {
     	return force.resume();
  	};

  	force.resume = function() {
   		if( !running )
  		{

	  	    event.start({type: "start"});
	  	    d3.timer(force.tick);
	  	}
	  	running = true;
    	return force;
  	};

  	force.stop = function() {
  		if( running )
  		{
  			event.end({type: "end"});
  		}
  		running = false;
    	return force;
  	};
  	
	return d3.rebind(force,event,"on");
};


