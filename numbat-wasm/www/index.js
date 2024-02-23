import init, { setup_panic_hook, Numbat, FormatType } from "./pkg/numbat_wasm.js";

async function fetch_exchange_rates() {
  try {
      const response = await fetch("https://workers-playground-broken-wave-5333.bsidhom.workers.dev/numbat/ecb-exchange-rates");

      if (!response.ok) {
          return;
      }

      const xml_content = await response.text();
      numbat.set_exchange_rates(xml_content);
  } catch (error) {
      console.error("Failed to load currency exchange rates from the European Central Bank");
      return;
  }
}

function create_numbat_instance() {
    return Numbat.new(true, true, FormatType.JqueryTerminal);
}

function updateUrlQuery(query) {
  let url = new URL(window.location);
  if (query == null) {
    url.searchParams.delete('q');
  } else {
    url.searchParams.set('q', query);
  }

  history.replaceState(null, null, url);
}

function interpret(input) {
  // Skip empty lines or comments
  var input_trimmed = input.trim();
  if (input_trimmed === "" || (input_trimmed[0] === "#" && input_trimmed.indexOf("\n") == -1)) {
    return;
  }

  if (input_trimmed == "clear") {
    this.clear();
    var output = "";
  } else if (input_trimmed == "reset") {
    numbat = create_numbat_instance();
    numbat.interpret("use units::currencies");
    combined_input = "";
    updateUrlQuery(null);
    this.clear();
  } else if (input_trimmed == "list" || input_trimmed == "ls") {
    output = numbat.print_environment();
  } else if (input_trimmed == "list functions" || input_trimmed == "ls functions") {
    output = numbat.print_functions();
  } else if (input_trimmed == "list dimensions" || input_trimmed == "ls dimensions") {
    output = numbat.print_dimensions();
} else if (input_trimmed == "list variables" || input_trimmed == "ls variables") {
    output = numbat.print_variables();
} else if (input_trimmed == "list units" || input_trimmed == "ls units") {
    output = numbat.print_units();
  } else if (input_trimmed == "help" || input_trimmed == "?") {
    output = numbat.help();
  } else {
    var result = {is_error: false};
    if (input_trimmed.startsWith("info ")) {
      var keyword = input_trimmed.substring(4).trim();
      output = numbat.print_info(keyword);
    } else {
      result = numbat.interpret(input);
      output = result.output;
    }

    if (!result.is_error) {
        combined_input += input.trim() + "⏎";
        updateUrlQuery(combined_input);
    }
  }

  return output;
}

function setup() {
  $(document).ready(function() {
    var term = $('#terminal').terminal(interpret, {
        greetings: false,
        name: "terminal",
        height: 550,
        prompt: "[[;;;prompt]>>> ]",
        checkArity: false,
        historySize: 200,
        historyFilter(line) {
          return line.trim() !== "";
        },
        completion(inp, cb) {
          cb(numbat.get_completions_for(inp));
        }
      });

    // evaluate expression in query string if supplied (via opensearch)
    if (location.search) {
      var queryParams = new URLSearchParams(location.search);
      if (queryParams.has("q")) {
        // feed in the query line by line, as if the user typed it in
        for (const line of queryParams.get("q").split("⏎")) {
          if (line.trim().length > 0) {
            term.exec(line.trim() + "\n");
          }
        }
      }
    }
  });
}

// TODO: I would prefer to use const lambdas rather than `function` in order to
// avoid unexpected `this` resolution. Not sure if there's a reason this is
// currently being used along with `var`. Those "old school" techniques do
// hoist, but this can easily be worked around by reordering declarations.
async function registerSw() {
  if ("serviceWorker" in navigator) {
    try {
      // NOTE: The service worker URL should be stable between releases or this
      // could lead to unexpected behavior.
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      // NOTE: We don't allow the error to propagate because the app should
      // still work without offline capabilities.
      console.error("Failed to register Service Worker:", error);
    }
  } else {
    console.warn("Service Workers not available in this browser");
  }
}

var numbat;
var combined_input = "";

async function main() {
  await Promise.all([init(), registerSw()]);

  setup_panic_hook();

  numbat = create_numbat_instance();
  combined_input = "";

  // Load KeyboardEvent polyfill for old browsers
  keyboardeventKeyPolyfill.polyfill();

  fetch_exchange_rates().then(setup);
}

main();
