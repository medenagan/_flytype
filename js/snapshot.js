//


// "the best", "best is" => "the best is"
function mergeOverlapping(long, short) {

  if (short.length > long.length) {
    var _long = long;
    long = short;
    short = _long;
  }

  if (long.indexOf(short) > -1) {
    return long;
  }

  for (var i = 1; i < short.length; i++) {

    var left = short.substr(0, i);
    var right = short.substr(i);

    if (long.endsWith(left)) {
      return long + right;
    }

    else if (long.startsWith(right)) {
      return short + long.substr(right.length);
    }
  }
}

function Snapshot() {

  var textes = [];

  this.push = function (text) {
    if (typeof text !== "string")
      return;

    text = text.toLowerCase();

    var lastIndex = -1;

    for (var i = 0; i < textes.length; i++) {

      var merged = mergeOverlapping(text, textes[i]);

      if (merged) {
        textes[i] = merged;
        text = merged;

        if (lastIndex > -1) {
          textes[lastIndex] = null;
        }
        lastIndex = i;
      }
    }

    if (lastIndex === -1) {
      textes.push(text);
    }

    else {
      textes = textes.filter(function (cached) {
        return cached;
      });
    }

    return textes;
  }

  this.getTextes = function () {
    return textes.slice();
  }
}
