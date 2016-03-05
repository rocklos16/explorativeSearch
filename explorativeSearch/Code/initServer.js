//npm libraries
var wordNet = require('wordnet-magic');
var wn = wordNet("data/_sqlite-31.db", true);
var http = require('http');
var fs = require('fs');
var url = require('url');
var wordnet = require('wordnet');
var Bing = require('node-bing-api')({
	accKey: "yVSXuh+X1MyF51lQOo793qqEo+E2tVE6veYyOUx75Cc"
});
var util = require("util");
var async = require("async"); // time problem


// Global variables 
var last_word = undefined;
var last_algo = "anamoly";
var words_arr = new Array();
var wait = 0;
var synonym_arr = new Array();
var json_arr = [];
var antonym_arr = new Array();
var hyponym_arr = new Array();
var holonym_arr = new Array();
var hypernym_arr = new Array();
var intersection_arr = new Array();
var response_arr = new Array();
var bing_response_arr = new Array();
var anomaly_response_arr = new Array();
var result_words = new Array();
var bing_words = new Array();
var syzygy_synset_arr = new Array();
var global_request;
var global_response;
var bing_wait = 1;
var orignal_word;
var sST = "";
var aST = "";
var syzygySearchTerm;
var bingSearchTerm;
var anomalySearchTerm;
var pageNo = 0;

// Create a server
http.createServer(function(request, response) {
	// Parse the request containing file name
	var pathname = url.parse(request.url).pathname;
	if (pathname.substr(1) == "both") {
		/// curently only autonomy is active
		aST = "";
		sST = "";
		clean_arrs();
		global_request = request;
		global_response = response;
		var word = getQuery(request);
		var algo = getAlgo(request);
		if (word != undefined) last_word = word;
		if (algo != undefined) last_algo = algo;
		//Page found	  
		// HTTP Status: 200 : OK
		// Content Type: text/plain
		global_response.writeHead(200, {
			'Content-Type': 'text/html'
		});
		word = last_word;
		orignal_word = word;
		console.log("now word in both is  : " + word);
		if (word != undefined) {
			console.log("before writing response");
			algorithm(word, last_algo);
			//global_response.end();
		} else {
			console.log("In else condition")
			response.write("Query cant be null value");
			response.end();
		}
		return;
	}
	if (pathname.substr(1) == "bingSpelling") {
		clean_arrs();
		global_request = request;
		global_response = response;
		var word = getQuery(request);
		if (word != undefined) last_word = word;
		//Page found	  
		// HTTP Status: 200 : OK
		// Content Type: text/plain
		global_response.writeHead(200, {
			'Content-Type': 'text/html'
		});
		word = last_word;
		orignal_word = word;
		console.log("now word in bingspelling is  : " + word);
		if (word != undefined) {
			console.log("before writing response");
			bingSpelling(word);
			//global_response.end();
		} else {
			console.log("In else condition")
			response.write("Query cant be null value");
			response.end();
		}
		return;
	}
	if (pathname.substr(1) == "more") {
		/// curently only autonomy is active
		clean_arrs();
		global_request = request;
		global_response = response;
		getMore(request);
		//Page found	  
		// HTTP Status: 200 : OK
		// Content Type: text/plain
		global_response.writeHead(200, {
			'Content-Type': 'text/html'
		});
		if (true) {
			console.log("before writing response");
			if (anomalySearchTerm != "") getAnomalyResponse((anomalySearchTerm + " " + bingSearchTerm));
			getBingResponse(bingSearchTerm);
			setTimeout(function() {
				if (syzygySearchTerm != "") bingit_both(syzygySearchTerm + " " + bingSearchTerm);
				else {
					var json_result = JSON.stringify({
						available_terms: [], //we can put all words instead of intersection 
						selected_terms: [],
						syzygyResults: response_arr,
						anomalyResults: anomaly_response_arr,
						bingResults: bing_response_arr,
						syzygySearchTerm: sST.toString(),
						anomalySearchTerm: aST.toString(),
						bingSearchTerm: bing_words.toString()
					});
					//global_response.write(response_arr.join());
					console.log("before ending response in syzygy");
					global_response.end(json_result);
				}
			}, 5000);
			//global_response.end();
		} else {
			console.log("In else condition")
			response.write("Query cant be null value");
			response.end();
		}
		return;
	}
	if (pathname.indexOf(".png") > -1) {
		console.log("image : " + pathname.substr(1));
		var img = fs.readFileSync(pathname.substr(1));
		response.writeHead(200, {
			'Content-Type': 'image/png'
		});
		response.end(img, 'binary');
		return;
	}
	if (pathname.indexOf(".gif") > -1) {
		console.log("image : " + pathname.substr(1));
		var img = fs.readFileSync(pathname.substr(1));
		response.writeHead(200, {
			'Content-Type': 'image/gif'
		});
		response.end(img, 'binary');
		return;
	}
	// Print the name of the file for which request is made.
	console.log("Request for " + pathname + " received.");
	// Read the requested file content from file system
	fs.readFile(pathname.substr(1), function(err, data) {
		if (err) {
			console.log(err);
			// HTTP Status: 404 : NOT FOUND
			// Content Type: text/plain
			response.writeHead(404, {
				'Content-Type': 'text/html'
			});
		} else {
			//Page found	  
			// HTTP Status: 200 : OK
			// Content Type: text/plain
			response.writeHead(200, {
				'Content-Type': 'text/html'
			});
			// Write the content of the file to response body
			response.write(data.toString());
		}
		// Send the response body 
		response.end();
	});
}).listen(8082);
// Console will print the message
console.log('Server running at http://127.0.0.1:8082/');

function bingSpelling(words) {
	console.log("words for spell : " + words);
	Bing.spelling(words, function(err, res, body) {
		if (err) {
			global_response.end(json_result);
		}
		//console.log(body.d.results); //awesome spell 
		try {
			var json_result = JSON.stringify({
				spellSuggestion: body.d.results[0]
			});
		} catch (err) {
			console.log(" bing spelling err : " + err.message);
		}
		//global_response.write(response_arr.join());
		console.log("before ending response");
		global_response.end(json_result);
	});
}

function getQuery(request) {
	// Parse the request containing file name
	var pathname = url.parse(request.url).pathname;
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	var word = query.word;
	// Print the name of the file for which request is made.
	console.log("Request for " + pathname + " received.");
	console.log("query for word " + word + " received.");
	return word;
}

function getMore(request) {
	// Parse the request containing file name
	var pathname = url.parse(request.url).pathname;
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	pageNo = query.pageNo;
	syzygySearchTerm = query.syzygySearchTerm;
	bingSearchTerm = query.bingSearchTerm;
	anomalySearchTerm = query.anomalySearchTerm;
}

function getAlgo(request) {
	// Parse the request containing file name
	var pathname = url.parse(request.url).pathname;
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	var word = query.algo;
	// Print the name of the file for which request is made.
	console.log("Request for " + pathname + " received.");
	console.log("query for algo " + word + " received.");
	return word;
}

function getArray(words) {
	console.log('getArray()');
}


/**

* Getting bing results for only orignal words + syzygy word
* This function is also ending response 

*/
function bingit_both(words) {
	var prev_words = words.toString();
	words = words.toString().replace(new RegExp(',', 'g'), ' ');
	console.log("geting syzygy response for : " + words);
	Bing.web(words, {
		top: 3, // Number of results (max 50) 
		skip: (3 * pageNo), // Skip first 3 results 
		market: 'en-US',
	}, function(error, res, body) {
		console.log("error in syzygy response : " + error);
		if (!error) {
			var jsonRes = body.d.results;
			var responseLength = jsonRes.length;
			console.log("syzygy response length : " + responseLength);
			for (var i = 0, len = jsonRes.length; i < len; ++i) {
				var link = jsonRes[i];
				response_arr.push({
					"DisplayUrl": link.DisplayUrl,
					"Url": link.Url,
					"Description": highlightWords(link.Description, prev_words),
					"Title": highlightWords(link.Title, prev_words)
				});
			}
			console.log("///// before send final response //////");
			console.log("syzygy_arr size : " + response_arr.length);
			console.log("anomaly_response_arr size : " + anomaly_response_arr.length);
			console.log("bing_response_arr size : " + bing_response_arr.length);
			var json_result = JSON.stringify({
				available_terms: intersection_arr.concat(antonym_arr), //we can put all words instead of intersection 
				selected_terms: orignal_word.toString().split(','),
				syzygyResults: response_arr,
				anomalyResults: anomaly_response_arr,
				bingResults: bing_response_arr,
				syzygySearchTerm: sST.toString(),
				anomalySearchTerm: aST.toString(),
				bingSearchTerm: bing_words.toString()
			});
			console.log("before ending response in syzygy");
			global_response.end(json_result);
		} else {
			bingit_both(words); // retrying 
			return;
		}
	});
}


/**

*Getting bing results for only orignal words + anomaly word

*/

function getAnomalyResponse(words) {
	var prev_words = words.toString();
	words = words.toString().replace(new RegExp(',', 'g'), ' ');
	console.log('getting anomaly response for : ' + words);
	Bing.web(words, {
		top: 3, // Number of results (max 50) 
		skip: (3 * pageNo), // Skip first 3 results 
		market: 'en-US',
	}, function(error, res, body) {
		console.log("getAnomalyResponse error : " + error);
		if (error) {
			getAnomalyResponse(words); // retrying 
			return;
		}
		var jsonRes = body.d.results;
		var responseLength = jsonRes.length;
		console.log("anomaly response length : " + responseLength);
		for (var i = 0, len = jsonRes.length; i < len; ++i) {
			var link = jsonRes[i];
			anomaly_response_arr.push({
				"DisplayUrl": link.DisplayUrl,
				"Url": link.Url,
				"Description": highlightWords(link.Description, prev_words),
				"Title": highlightWords(link.Title, prev_words)
			});
		}
		console.log("anomaly_response_arr : " + anomaly_response_arr.toString());
		
	});
}




/**

*Getting bing results for only orignal words 

*/
function getBingResponse(words) {
	var prev_words = words.toString();
	words = words.toString().replace(new RegExp(',', 'g'), ' ');
	console.log('getting bing response for  : ' + words);
	Bing.web(words, {
		top: 4, // Number of results (max 50) 
		skip: (4 * pageNo), // Skip first 3 results 
		options: "EnableHighlighting",
		market: 'en-US',
	}, function(error, res, body) {
		console.log("bing request error : " + error);
		if (error) {
			getBingResponse(words); // retrying 
			return;
		}
		var jsonRes = body.d.results;
		var responseLength = jsonRes.length;
		for (var i = 0, len = jsonRes.length; i < len; ++i) {
			var link = jsonRes[i];
			bing_response_arr.push({
				"DisplayUrl": link.DisplayUrl,
				"Url": link.Url,
				"Description": highlightWords(link.Description, prev_words),
				"Title": highlightWords(link.Title, prev_words)
			});
		}
		console.log("bing_response_arr : " + bing_response_arr.toString());
	});
}


/**
 * This function will be executed after having hyponym, holonym, hypernym and antonym
 * it will generate bing request for orignal word
 * It will randomly select antonym
 * then it will generate bing request for antonym
 * it will take intersection of hyponym, holonym & hypernym arrays and then it will randomly select a word
 * then it will generate bing request for syzygy
 * randomly selected word and orignail search words will be sent for bing search 
 */

function intersection_both() {
	console.log("//////////intersection both fun///////////////////");
	getBingResponse(orignal_word); // for direct bing results 
	console.log("printing anamoly : " + antonym_arr.toString());
  
  	//if still no antonym then we will give it one more chance by providing more time 
	if (antonym_arr.length > 0) {
		result_words = new Array();
		var antonym = getRandomInt(0, (antonym_arr.length - 1));
		aST = antonym_arr[antonym];
		result_words.push(antonym_arr[antonym]);
		result_words = result_words.concat(words_arr);
		console.log(result_words);
		console.log("result words for anomaly : " + result_words.toString());
		getAnomalyResponse(result_words); 
	} else {
      
      	// providing little bit more time for getting antonym 
		setTimeout(function() {
			console.log("printing anamoly : " + antonym_arr.toString());
			if (antonym_arr.length > 0) {
				result_words = new Array();
				var antonym = getRandomInt(0, (antonym_arr.length - 1));
				aST = antonym_arr[antonym];
				result_words.push(antonym_arr[antonym]);
				result_words = result_words.concat(words_arr);
				console.log(result_words);
				console.log("result words for anomaly : " + result_words.toString());
				getAnomalyResponse(result_words);
			}
          
          	// this is the time which we need for syzygy algorithm to have some words 
			setTimeout(function() {
				syzygyProcessing();
			}, 5000);
		}, 2000);
		return;
	}
	setTimeout(function() {
	
      syzygyProcessing();
      
	}, 18000);
}

/**
 * This function purely perform syzygy algorithm task
 */

function syzygyProcessing(){
  
 
  console.log("printing holo : " + holonym_arr.toString());
  console.log("printing hypo : " + hyponym_arr.toString());
  console.log("printing hyper : " + hypernym_arr.toString());


  // intersection of arrays
  for (var i = 0; i < hyponym_arr.length; i++) {
    if (holonym_arr.indexOf(hyponym_arr[i]) != -1 && hypernym_arr.indexOf(hyponym_arr[i]) != -1) {
      intersection_arr.push(hyponym_arr[i]);
    }
  }

  console.log("printing intersection : " + intersection_arr.toString());
  
  // if we dont have syzygy word then we dont need to request bing for it
  if (intersection_arr.length == 0) {
    console.log("both arrays are empty : ");
    var json_result = JSON.stringify({
      available_terms: [], //we can put all words instead of intersection 
      selected_terms: orignal_word.toString().split(','),
      syzygyResults: [],
      anomalyResults: [],
      bingResults: bing_response_arr,
      syzygySearchTerm: sST.toString(),
      anomalySearchTerm: aST.toString(),
      bingSearchTerm: bing_words.toString()
    });
    console.log("before ending empty arrays response");
    global_response.end(json_result);
    return;
  }
  if (intersection_arr.length > 0) {
    result_words = new Array();
    var syzygy = getRandomInt(0, (intersection_arr.length - 1));
    sST = intersection_arr[syzygy];
    result_words.push(intersection_arr[syzygy]);
    result_words = result_words.concat(words_arr);
    console.log(result_words);
    console.log("result words for syzygy : " + result_words.toString());
    bingit_both(result_words);
  }
  
  return;
  
  
  
}

/**
 * This function initiate zyzygy and anomaly algorithm 
 * @param 1 words 
 * @param 2 algo
 */

function algorithm(words, algo) {
	clean_arrs();
	words = words.toLowerCase();
	words_arr = words.split(',');
	bing_words = words.split(',');
	console.log('algorithms fun : ' + words_arr.toString());
	if (algo == "both_algo") {
		var algo_counter = 0
		for (var i = 0;
			((i < words_arr.length) && (i < 2)); i++) {
			try {
				holo_hyper_hypo_nym(words_arr[algo_counter]);
			} catch (err) {
				console.log("syzygy call err : " + err.message);
			}
			try {
				anamoly(words_arr[algo_counter++]);
			} catch (err) {
				console.log("anomaly call err : " + err.message);
			}
		}
		setTimeout(intersection_both, 20000); // we can set time on the basis of array size also 
		console.log("////////  end of both algo //////////////");
	}
	if (algo == "syzygy") {
		for (var i = 0; i < words_arr.length; i++) {
			holo_hyper_hypo_nym(words_arr[i]);
		}
		setTimeout(intersection, 20000); // we can set time on the basis of array size also 
		console.log("////////  end of syzygy //////////////");
	}
	if (algo == "anamoly") {
		for (var i = 0; i < words_arr.length; i++) {
			anamoly(words_arr[i]);
		}
		setTimeout(generateResponse, 2000); // this will be only time for any number of words because it running anamoly fun asyn for each word
		console.log("////////  end of anto //////////////");
	}
	return;
}


function getRandomInt(min_val, max_val) {
	return Math.floor(Math.random() * (max_val - min_val + 1)) + min_val;
}


/**

* For each new request this function will be called to clear all golbal variables and arrays 

*/

function clean_arrs() {
	anomaly_response_arr = new Array();
	words_arr = new Array();
	wait = 0;
	synonym_arr = new Array();
	json_arr = [];
	antonym_arr = new Array();
	hyponym_arr = new Array();
	holonym_arr = new Array();
	hypernym_arr = new Array();
	intersection_arr = new Array();
	response_arr = new Array();
	result_words = new Array();
	bing_response_arr = new Array();
	bing_words = new Array();
	syzygy_synset_arr = new Array();
	pageNo = 0;
}


/**
 * This function is the implementation syzygy algorithm 
 * @param 1 words 
 */

function holo_hyper_hypo_nym(words) {
	console.log("in syzygy algo : " + words.toLowerCase());
	var word_obj = new wn.Word(words.toLowerCase());
	var bark = new wn.Word(words);
  
  	//getting synonyms
	word_obj.getSynsets(function(err, synsetArray) {
		if (err) {
			console.log("err syzygy : " + err);
			return;
		}
      
      	
		for (i = 0; i < synsetArray.length; i++) {
			

          
          	// for each synset getting holonyms
			synsetArray[i].getHolonyms().each(function(holonym) {
				for (var j = 0; j < holonym.words.length; j++) {
					var words_holonym = holonym.words[j].lemma;
					if (holonym_arr.indexOf(words_holonym) == -1) { //avoiding duplicates 
						holonym_arr.push(words_holonym);
					}
				}
			});
          
          	// for each synset getting hyponyms
			synsetArray[i].getHyponyms().each(function(hyponym) {
				for (var j = 0; j < hyponym.words.length; j++) {
					var words_hyponym = hyponym.words[j].lemma;
					if (hyponym_arr.indexOf(words_hyponym) == -1) { //avoiding duplicates 
						hyponym_arr.push(words_hyponym);
					}
				}
			});
          
          	// for each synset getting hypernym
			synsetArray[i].getHypernyms().each(function(hypernym) {
				for (var j = 0; j < hypernym.words.length; j++) {
					var words_hypernym = hypernym.words[j].lemma;
					if (hypernym_arr.indexOf(words_hypernym) == -1) { //avoiding duplicates 
						hypernym_arr.push(words_hypernym);
					}
				}
			});
		}
	});
	console.log("syzygy end for : " + words.toLowerCase());
	return;
}

/**
 * It will get antonym of all synonyms of given word
 * @param 1 words 
 */
 
function anamoly(words) {
	console.log("anamoly fun words : " + words);
	var word_obj = new wn.Word(words);
	word_obj.getSynsets(function(err, data) {
		if (err) {
			console.log("err anamoly : " + err);
			return;
		}
		for (i = 0; i < data.length && i < 2; i++) {
			var words1_obj = data[i].words;
			for (j = 0; j < words1_obj.length; j++) {
				var words2_obj = words1_obj[j].lemma;
				if (synonym_arr.indexOf(words2_obj) == -1) { //avoiding duplicates 
					synonym_arr.push(words2_obj);
				}
			}
		}
      
		for (i = 0; i < synonym_arr.length; i++) {
          
			var new_word = new wn.Word(synonym_arr[i]);
			new_word.getAntonyms(function(err, antonymArray) {
				for (j = 0; j < antonymArray.length; j++) {
					antonym_arr.push(antonymArray[j].antonym);
					console.log("antonym_arr size : " + antonym_arr.length);
					if (antonym_arr.length > 10) return;
				}
				console.log("printing anto for " + words + " : " + antonym_arr.toString());
			});
		}
	});
	console.log(" anto end for " + words + " : " + antonym_arr.toString());
}

/**
 * Highlight particular words in text 
 * @param 1 text 
 * @param 2 words
 * @return text
 */

function highlightWords(text, words) {
	var w_array = words.split(',');
	for (var i = 0; i < w_array.length; i++) {
		console.log("highlighting : " + w_array[i]);
		var rgxp = new RegExp(w_array[i], 'ig');
		var repl = '<strong>' + w_array[i] + '</strong>';
		text = text.replace(rgxp, repl);
		//console.log(text);
	}
  
	return text;
}
