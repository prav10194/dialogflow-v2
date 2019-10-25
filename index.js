"use strict";

var express = require("express");
var app = express();

var bodyParser = require("body-parser");
var router = express.Router();
var http = require("http").Server(app);
var request = require("request");

require("dotenv").config();

// You need it to get the body attribute in the request object.
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

var google_response = {
  outputContexts: [
    {
      name:
        "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/last_response",
      lifespanCount: 5,
      parameters: {
        context: null
      }
    }
  ],
  payload: {
    google: {
      expectUserResponse: true,
      richResponse: {
        items: [
          {
            simpleResponse: {
              textToSpeech: "here is the response"
            }
          },
          {
            basicCard: {
              title: "Here is your response to your query",
              formattedText: ""
            }
          }
        ],
        suggestions: [
          {
            title: "names of people in space"
          },
          {
            title: "number of people in space"
          },
          {
            title: "answer to my last result"
          }
        ]
      }
    }
  }
};

var getAstronautsDetails = () => {
  var promise = new Promise((resolve, reject) => {
    var options = {
      method: "GET",
      url: "http://api.open-notify.org/astros.json",
      headers: {
        "Postman-Token": "d0399333-f36e-4cd2-8348-ccd8e0f8e03c",
        "cache-control": "no-cache"
      }
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      resolve(body);
    });
  });
  return promise;
};

app.post("/spacemen", function(req, res) {
  console.log(
    "req.body",
    JSON.stringify(req.body.queryResult.intent.displayName, null, 2)
  );

  getAstronautsDetails().then(astronautsJSON => {
    if (req.body.queryResult.intent.displayName == "GetNames") {
      var peoples = JSON.parse(astronautsJSON).people;

      var outputTextForSpeech = "";
      var outputTextForText = "";

      peoples.forEach(people => {
        outputTextForSpeech =
          outputTextForSpeech +
          people.name +
          " from craft: " +
          people.craft +
          "<break time='2' />";

        outputTextForText =
          outputTextForText +
          people.name +
          " from craft: " +
          people.craft +
          "<br/>";
      });

      // console.log("outputText: ", outputText);

      google_response.payload.google.richResponse.items[0].simpleResponse.textToSpeech =
        "<speak>" + outputTextForSpeech + "</speak>";

      google_response.payload.google.richResponse.items[1].basicCard.formattedText = outputTextForText;

      var context_object = {
        question: req.body.queryResult.queryText,
        answer: outputTextForText
      };

      google_response.outputContexts[0].parameters.context = context_object;

      // console.log("google_response", JSON.stringify(google_response, null, 2));

      res.send(google_response);
    }

    if (req.body.queryResult.intent.displayName == "GetNumber") {
      // console.log("astronautsJSON", JSON.stringify(astronautsJSON, null, 2));

      var number = JSON.parse(astronautsJSON).number;

      console.log("number: ", number);

      var outputText =
        "There are " + number + " astranouts currently in space.";

      google_response.payload.google.richResponse.items[0].simpleResponse.textToSpeech =
        "<speak>" + outputText + "</speak>";

      google_response.payload.google.richResponse.items[1].basicCard.formattedText = outputText;

      console.log("google_response", JSON.stringify(google_response, null, 2));

      google_response.outputContexts[0].parameters.context = {
        question: req.body.queryResult.queryText,
        answer: outputText
      };

      res.send(google_response);
    }

    if (req.body.queryResult.intent.displayName == "LastResult") {
      console.log("LastResult", JSON.stringify(req.body.queryResult, null, 2));
      var outputText = "";

      req.body.queryResult.outputContexts.find(function(element, index) {
        console.log("element: ", JSON.stringify(element, null, 2));
        if (element.name.split("/").pop() == "last_response") {
          outputText =
            "Question was: " +
            element.parameters.context.question +
            " and the answer was: " +
            element.parameters.context.answer;
        }
      });

      google_response.payload.google.richResponse.items[0].simpleResponse.textToSpeech =
        "<speak>" + outputText + "</speak>";
      google_response.payload.google.richResponse.items[1].basicCard.formattedText = outputText;

      // console.log("google_response", JSON.stringify(google_response, null, 2));

      res.send(google_response);
    }
  });
});

app.listen(8080, function() {
  console.log("Example app listening on port 8080!");
});
