const Response = require("./Response");

const getMappingEntries = (mappings) =>
  mappings instanceof Map ? mappings.entries() : Object.entries(mappings);

const getMappingResponse = (mappings, error) => {
  let mappingResponse = {};
  for (const [errorRegex, mapping] of getMappingEntries(mappings)) {
    if (error.name.match(errorRegex) || error.message.match(errorRegex)) {
      mappingResponse = mapping(error);
      break;
    }
  }

  return mappingResponse;
};

class ErrorConverter {
  constructor(mappings) {
    this.mappings = mappings;
  }

  convert(error) {
    const mappingResponse = getMappingResponse(this.mappings, error);
    const body = mappingResponse.body || error.message;
    const statusCode = mappingResponse.statusCode || error.statusCode || 500;
    const headers = mappingResponse.headers || {};

    return new Response(body, statusCode, headers);
  }
}

module.exports = ErrorConverter;
