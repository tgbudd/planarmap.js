var crowbar = (function() {
  var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

  window.URL = (window.URL || window.webkitURL);

  var body = document.body,
      emptySvg;

  var prefix = {
    xmlns: "http://www.w3.org/2000/xmlns/",
    xlink: "http://www.w3.org/1999/xlink",
    svg: "http://www.w3.org/2000/svg"
  };


  function findAndParseSVGs() {
    var documents = [window.document],
        SVGSources = [];
        iframes = document.querySelectorAll("iframe"),
        objects = document.querySelectorAll("object");

    // add empty svg element
    var emptySvg = window.document.createElementNS(prefix.svg, 'svg');
    window.document.body.appendChild(emptySvg);
    var emptySvgDeclarationComputed = getComputedStyle(emptySvg);

    [].forEach.call(iframes, function(el) {
      try {
        if (el.contentDocument) {
          documents.push(el.contentDocument);
        }
      } catch(err) {
        console.log(err);
      }
    });

    [].forEach.call(objects, function(el) {
      try {
        if (el.contentDocument) {
          documents.push(el.contentDocument);
        }
      } catch(err) {
        console.log(err)
      }
    });

    documents.forEach(function(doc) {
      var newSources = getSources(doc, emptySvgDeclarationComputed);
      // because of prototype on NYT pages
      for (var i = 0; i < newSources.length; i++) {
        SVGSources.push(newSources[i]);
      }
    });
    return SVGSources;

  }
  
  function downloadById(id,tags,fontstyle) {
	var emptySvg = window.document.createElementNS(prefix.svg, 'svg');
	window.document.body.appendChild(emptySvg);
    var emptySvgDeclarationComputed = getComputedStyle(emptySvg);
    body.removeChild(emptySvg);
    
    var svg = document.getElementById(id);
    
    svg.setAttribute("version", "1.1");

	// removing attributes so they aren't doubled up
	svg.removeAttribute("xmlns");
	svg.removeAttribute("xlink");

	// These are needed for the svg
	if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
	svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
	}

	if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
	svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
	}

	setInlineStyles(svg, emptySvgDeclarationComputed,tags,fontstyle);

	var source = (new XMLSerializer()).serializeToString(svg);
	var rect = svg.getBoundingClientRect();
	var info = {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		class: svg.getAttribute("class"),
		id: svg.getAttribute("id"),
		childElementCount: svg.childElementCount,
		source: [doctype + source]
	};
	download(info);  
  }

  function getSources(doc, emptySvgDeclarationComputed) {
    var svgInfo = [],
        svgs = doc.querySelectorAll("svg");

    [].forEach.call(svgs, function (svg) {

      svg.setAttribute("version", "1.1");

      // removing attributes so they aren't doubled up
      svg.removeAttribute("xmlns");
      svg.removeAttribute("xlink");

      // These are needed for the svg
      if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
      }

      if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
      }

      setInlineStyles(svg, emptySvgDeclarationComputed);

      var source = (new XMLSerializer()).serializeToString(svg);
      var rect = svg.getBoundingClientRect();
      svgInfo.push({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        class: svg.getAttribute("class"),
        id: svg.getAttribute("id"),
        childElementCount: svg.childElementCount,
        source: [doctype + source]
      });
    });
    return svgInfo;
  }

  function prepareBlob(source){
	var src = source.source[0].replace(/&lt;!\[CDATA/g,'<![CDATA').replace(/\]\]&gt;/g,']]>');
    return new Blob([src], { "type" : "text\/xml" });
  }
  function download(source) {
    var filename = "untitled";

    if (source.id) {
      filename = source.id;
    } else if (source.class) {
      filename = source.class;
    } else if (window.document.title) {
      filename = window.document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    var url = window.URL.createObjectURL(prepareBlob(source));
    

    var a = document.createElement("a");
    body.appendChild(a);
    a.setAttribute("class", "svg-crowbar");
    a.setAttribute("download", filename + ".svg");
    a.setAttribute("href", url);
    a.style["display"] = "none";
    a.click();
    body.removeChild(a);

    setTimeout(function() {
      window.URL.revokeObjectURL(url);
    }, 10);
  }


  function setInlineStyles(svg, emptySvgDeclarationComputed,tags,fontstyle) {

    function explicitlySetStyle (element) {
      var cSSStyleDeclarationComputed = getComputedStyle(element);
      var i, len, key, value;
      var computedStyleStr = "";
      for (i=0, len=cSSStyleDeclarationComputed.length; i<len; i++) {
        key=cSSStyleDeclarationComputed[i];
        value=cSSStyleDeclarationComputed.getPropertyValue(key);
        if (value!==emptySvgDeclarationComputed.getPropertyValue(key) 
			&& key != 'font-family'	&& key != 'font-size'
			&& (tags === undefined || tags.indexOf(key) > -1 ) ) {
          computedStyleStr+=key+":"+value+";";
        }
      }
      if (element.tagName == 'text' || element.tagName == 'tspan') {
		if( fontstyle !== undefined )
		{
			computedStyleStr += fontstyle;
		} else {
			computedStyleStr += 'font-size:' + cSSStyleDeclarationComputed.fontSize+';';
			/*
			var fw = cSSStyleDeclarationComputed.fontWeight,
				ff = 'NYTFranklin' + (fw == 300 || fw == 'light' ? 'Light' : fw > 400 || fw == 'bold' ? 'Bold' : 'Medium');
			*/
			computedStyleStr += 'font-family:' + cSSStyleDeclarationComputed.fontFamily;
		}
      }
      if( element.tagName != 'jsondata' )
      {
		element.setAttribute('style', computedStyleStr);
	  }
    }
    function traverse(obj){
      var tree = [];
      tree.push(obj);
      visit(obj);
      function visit(node) {
        if (node && node.hasChildNodes()) {
          var child = node.firstChild;
          while (child) {
            if (child.nodeType === 1 && child.nodeName != 'SCRIPT'){
              tree.push(child);
              visit(child);
            }
            child = child.nextSibling;
          }
        }
      }
      return tree;
    }
    // hardcode computed css styles inside svg
    var allElements = traverse(svg);
    var i = allElements.length;
    while (i--){
      explicitlySetStyle(allElements[i]);
    }
  }

  return{
    findAndParseSVGs:findAndParseSVGs,
    download:download,
    prepareBlob:prepareBlob,
    downloadById:downloadById
  }
})();
