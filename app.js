const express = require("express");
const debug = require("debug");
const bodyParser = require("body-parser");
const _ = require("lodash");
const request = require("request");

const app = express();
app.use(bodyParser.json());

const log = debug("turn:");

const optin_state = {};

app.post("/context", (req, resp) => {
  log("/context", { optin_state });
  if (req.body.handshake === true) {
    log(`Doing handshake for ${req.body.name}.`);
    resp.json({
      capabilities: {
        actions: true,
        context_objects: [
          {
            title: "Optin status",
            code: "opt-in",
            icon: "info-circle",
            type: "table"
          }
        ]
      }
    });
  } else {
    const owner = _.get(req.body, "messages[0]._vnd.v1.chat.owner");
    log(`Handling context request for ${owner}`);

    const current_status = optin_state[owner] || "Unknown";
    const opt_action =
      current_status === "Opted in"
        ? {
            description: `Opt out ${owner}`,
            url: "/opt_status",
            payload: {
              opt_status: "opt_out"
            }
          }
        : {
            description: `Opt in ${owner}`,
            url: "/opt_status",
            payload: {
              opt_status: "opt_in"
            }
          };

    resp.json({
      version: "1.0.0-alpha",
      context_objects: {
        "opt-in": {
          "Opt-in status": current_status
        }
      },
      actions: {
        opt_status: opt_action
      }
    });
  }
});

app.post("/opt_status", (req, resp) => {
  const {
    address,
    payload,
    integration_action_uuid,
    integration_uuid
  } = req.body;
  const { opt_status } = payload;
  log("/opt_status", { opt_status, address });
  if (opt_status === "opt_in") {
    optin_state[address] = "Opted in";
  } else {
    optin_state[address] = "Opted out";
  }

  resp.json({});

  request(
    {
      method: "POST",
      uri: `https://whatsapp.praekelt.org/api/integrations/${integration_uuid}/notify/finish`,
      headers: {
        "Content-Type": "application/json"
      },
      json: {
        integration_action_uuid
      }
    },
    function(error, response, body) {
      if (response.statusCode == 201) {
        console.log("document saved", { body });
      } else {
        console.log("error: " + response.statusCode);
        console.log(body);
      }
    }
  );
});

module.exports = app;
