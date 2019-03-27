
Object.prototype.toJSONFile = function (spaces) {
  var blob = new Blob([JSON.stringify(this, false, spaces)], {type: "text/csv;charset=utf-8;"}); // Does not save without csv
  window.open(URL.createObjectURL(blob));
};

String.prototype.toBlobFile = function () {
  var blob = new Blob([this], {type: "text/csv;charset=utf-8;"});
  window.open(URL.createObjectURL(blob));
};

Array.prototype.toCSVString_ = function (tab, newline) {
  tab = tab || "\t";
  newline = newline || "\n";
  var args = []; var list = [];
  for (var k = 0; k < this.length; k++) {
    var element = this[k];
    var properties;
    var typeElement = Array.isArray(element) ? "array" : typeof(element);
    switch (typeElement) {
      case "string":
      case "number":
      case "boolean":
      case "array":
        var value = element;
        properties = ["[" + typeElement + "]"];
        element = {};
        element[properties[0]] = value;
        break;
      default:
        properties = Object.getOwnPropertyNames(element);
    }
    args.uniquePush.apply(args, properties);
    list.push(args.map(function (a) {
      return element.hasOwnProperty(a) ? String(element[a]) : ""; //  JSON.stringify(element[a])
    }).join(tab));
  }
  list.unshift(args.join(tab));
  return list.join(newline);
};

Array.prototype.uniquePush_ = function () {
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (this.indexOf(a) === -1) this.push(a);
  }
};
