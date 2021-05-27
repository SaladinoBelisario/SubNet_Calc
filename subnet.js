Array.prototype.sum = function () {
  var sum = 0;
  for (var i = 0; i < this.length; i++) {
    sum += parseInt(this[i]);
  }
  return sum;
};
String.prototype.repeat = function(count) {
  var result = "";
  for (var i = 0; i < count; i++) {
    result += this;
  }
  return result;
};


function ipInfo() {
  this.defaultMask = 0;
  this.netClass = 0;
  this.hosts = 0;
  this.subnets = 0;
  this.subnetId = 0;
  this.networkId = 0;

  this.validMasks   = new Array();
  this.validHosts   = new Array();
  this.validSubnets = new Array();

  this.ipOctetArray = new Array();
  this.ipString = "";
  this.ip = 0;

  this.maskOctetArray = new Array();
  this.maskString = "";
  this.mask = 0;
  
  this.generateMasks = function () {
    /*  /32 nos deja con 0 bits para el host
        /31 nos deja con 1 bit para el host pero esta reservado para Broadcast
        /30 es la mascara mas alta qrealmente utilizable*/
    var masks = new Array();
    var bitCount = this.defaultMask.toString(2).split("").sum();
    for (var i = bitCount; i <= 30; i++) {
      masks[i - bitCount] = parseInt("1".repeat(i) + "0".repeat(32 - i),2);
    }
    this.validMasks =  masks;
  };
  this.generateHosts = function() {
    var hosts = new Array();
    var bitTotal = bitwiseNot(this.defaultMask).toString(2).split("").length;
    for (var i = 1; i < bitTotal; i++) {
      hosts[i - 1] = Math.pow(2, i + 1) - 2;
    }
    this.validHosts =  hosts.reverse();
  };
  this.generateSubnets = function () {
    /*  los ultimos dos bits sin mascara no se pueden usar para subredes
        porque dejarian 0 y 2 bits para hosts respectivamente,
        pero estas dos direcciones en cada subred son para broadcast e ID de red*/
    var subnets = new Array();
    var bitTotal = bitwiseNot(this.defaultMask).toString(2).split("").length;
    for (var i = 0; i <= bitTotal -2; i++) {
      subnets[i] = Math.pow(2, i);
    }
    this.validSubnets = subnets;
  };
  this.parseIp = function(ipString) {
    this.ipString = ipString;
    this.ipOctetArray = ipString.split(".");
    this.ip = this.parseOctets(this.ipOctetArray);
    if (!this.ip) {
      return false;
    }
    switch (true) {
      case (this.ipOctetArray[0] >= 1 && this.ipOctetArray[0] <= 126):
        this.netClass = "A";
        this.defaultMask = 0xFF000000; // 255.0.0.0
        break;
      case (this.ipOctetArray[0] >= 128 && this.ipOctetArray[0] <= 191):
        this.netClass = "B";
        this.defaultMask = 0xFFFF0000; // 255.255.0.0
        break;
      case (this.ipOctetArray[0] >= 192 && this.ipOctetArray[0] <= 223):
        this.netClass = "C";
        this.defaultMask = 0xFFFFFF00; // 255.255.255.0
        break;
      default:
        this.netClass = false; // IP invalida, o Clases E y D (no funcionan con la calculadora)
        this.defaultMask = false;
        break;
    }
    if (this.mask) {
      this.subnetId = bitwiseAnd(this.ip,this.mask);
    }
    this.networkId = bitwiseAnd(this.ip,this.defaultMask);
    this.generateMasks();
    this.generateHosts();
    this.generateSubnets();
    return true;
  };
  this.parseMask = function(maskString) {
    if (maskString === "") {
      maskString = toOctets(this.defaultMask);
    }
    this.maskString = maskString;
    this.maskOctetArray = maskString.split(".");
    this.mask = this.parseOctets(this.maskOctetArray);
    if (!this.mask) {
      return false;
    }
    this.hosts = bitwiseNot(this.mask) - 1;
    if (this.defaultMask) {
      this.subnets = Math.pow(2,bitwiseXor(this.mask,this.defaultMask).toString(2).split("").sum());  
    }
    if (this.ip) {
      this.subnetId = bitwiseAnd(this.ip,this.mask);
    }
    return true;
  };
  this.parseMaskByHosts = function (hosts) {
    var bitCount = parseInt(hosts).toString(2).split("").length;
    var maskString = toOctets(parseInt("1".repeat(32 - bitCount) + "0".repeat(bitCount),2));
    return this.parseMask(maskString);
  };
  this.parseMaskBySubnets = function (subnets) {
    var bitCount = this.defaultMask.toString(2).split("").sum() + Math.log(subnets)/Math.log(2);
    var maskString = toOctets(parseInt("1".repeat(bitCount) + "0".repeat(32 - bitCount), 2));
    return this.parseMask(maskString);
  };
  this.parseOctets = function(octetArray) {
    var result = 0;
    if (octetArray.length != 4) {
      return false;
    }
    for (var i = 0; i < 4; i++) {
      if (octetArray[i] > 255 || octetArray[i] < 0) {
        return false;
      }
      result = bitwiseOr(bitwiseLShift(result,8), parseInt(octetArray[i]));
    }
    return result;
  }
}
function ipFromClass(netClass) {
  switch (netClass) {
    case "A":
      return "10.0.0.1";//Red ejemplo clase A
    case "B":
      return "172.16.0.1";//Red ejemplo clase B
    case "C":
      return "192.168.0.1";//Red ejemplo clase C
    default:
      return false;
  }
}

function fillSelect(selectObj, dataArray, withOctets) {
  while (selectObj.length) {
    selectObj.remove(0);
  }
  for (var i = 0; i < dataArray.length; i++) {
    var tmpOpt = document.createElement('option');
    if (withOctets) {
      tmpOpt.text = toOctets(dataArray[i]);
      tmpOpt.setAttribute('id', selectObj.id + toOctets(dataArray[i]));
    }
    else {
      tmpOpt.text = dataArray[i];
      tmpOpt.setAttribute('id', selectObj.id + dataArray[i]);
    }
    selectObj.add(tmpOpt,null);
  }
}

function action(actionId) {
  var fatalErr = "";
  var ipObj       = document.getElementById("ip");
  var maskObj     = document.getElementById("mask");
  var classObj    = document.getElementById("class");
  var hostsObj    = document.getElementById("hosts");
  var subnetsObj  = document.getElementById("subnets");
  var tableObj    = document.getElementById("infotable");
  var ip = new ipInfo;

  if (actionId == "class" || actionId == "load") {
    ipObj.value = ipFromClass(classObj.value);
  }
  if(!ip.parseIp(ipObj.value) && ipObj.value) {
    fatalErr = "Invalid IP\n";
  }
  if(!ip.parseMask(maskObj.value) && maskObj.value) {
    fatalErr = "Invalid Mask\n";
  }
  if (fatalErr) {
    alert(fatalErr);
    return false;
  }
  //Detecta los cambios en los menus desplegables de clase y de ip por si cambia de clase
  if (classObj.options[classObj.selectedIndex].value != ip.netClass || actionId == "class" || actionId == "load") {
    fillSelect(maskObj, ip.validMasks, true);
    fillSelect(hostsObj, ip.validHosts);
    fillSelect(subnetsObj, ip.validSubnets);
    ip.parseMask(toOctets(ip.defaultMask));
  }
  if (actionId == "prevsubnet") {
    ip.parseIp(toOctets(ip.subnetId - 2));  // ultimo host de la subred anterior
    ip.parseIp(toOctets(ip.subnetId + 1));  // primer host de la misma subred
    ipObj.value = ip.ipString;
  }
  if (actionId == "nextsubnet") {
    ip.parseIp(toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)) + 2));
    ipObj.value = ip.ipString;
  }
  if (actionId == "hosts") {
    ip.parseMaskByHosts(hostsObj.options[hostsObj.selectedIndex].value);
  }
  if (actionId == "subnets") {
    ip.parseMaskBySubnets(subnetsObj.options[subnetsObj.selectedIndex].value);
  }

  document.getElementById(maskObj.id + ip.maskString).selected = true;
  document.getElementById(hostsObj.id + ip.hosts).selected = true;
  document.getElementById(subnetsObj.id + ip.subnets).selected = true;
  document.getElementById(classObj.id + ip.netClass).selected = true;

  //ID de red
  tableObj.rows[1].cells[1].innerHTML = toOctets(ip.networkId);
  tableObj.rows[1].cells[2].innerHTML = toOctets(ip.networkId, 16);
  tableObj.rows[1].cells[3].innerHTML = colorCodeBits(toOctets(ip.networkId, 2), ip.defaultMask, ip.mask);

  //ID de subred
  tableObj.rows[2].cells[1].innerHTML = toOctets(ip.subnetId);
  tableObj.rows[2].cells[2].innerHTML = toOctets(ip.subnetId, 16);
  tableObj.rows[2].cells[3].innerHTML = colorCodeBits(toOctets(ip.subnetId, 2), ip.defaultMask, ip.mask);

  //Primera direccion
  tableObj.rows[3].cells[1].innerHTML = toOctets(ip.subnetId + 1);
  tableObj.rows[3].cells[2].innerHTML = toOctets(ip.subnetId + 1, 16);
  tableObj.rows[3].cells[3].innerHTML = colorCodeBits(toOctets(ip.subnetId + 1, 2), ip.defaultMask, ip.mask);

  //Ultima direccion
  tableObj.rows[4].cells[1].innerHTML = toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)) - 1);
  tableObj.rows[4].cells[2].innerHTML = toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)) - 1, 16);
  tableObj.rows[4].cells[3].innerHTML = colorCodeBits(toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)) - 1, 2), ip.defaultMask, ip.mask);

  //Broadcast
  tableObj.rows[5].cells[1].innerHTML = toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)));
  tableObj.rows[5].cells[2].innerHTML = toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)), 16);
  tableObj.rows[5].cells[3].innerHTML = colorCodeBits(toOctets(bitwiseOr(bitwiseNot(ip.mask), bitwiseAnd(ip.mask, ip.ip)), 2), ip.defaultMask, ip.mask);

  //Mascara de subred
  tableObj.rows[6].cells[1].innerHTML = ip.maskString;
  tableObj.rows[6].cells[2].innerHTML = toOctets(ip.mask, 16);
  tableObj.rows[6].cells[3].innerHTML = colorCodeBits(toOctets(ip.mask, 2), ip.defaultMask, ip.mask);

  //Wildcard
  tableObj.rows[7].cells[1].innerHTML = toOctets(bitwiseNot(ip.mask));
  tableObj.rows[7].cells[2].innerHTML = toOctets(bitwiseNot(ip.mask), 16);
  tableObj.rows[7].cells[3].innerHTML = colorCodeBits(toOctets(bitwiseNot(ip.mask), 2), ip.defaultMask, ip.mask);

  return true;
}

//Convierte la cadena a secciones de 8 bits con colores
function colorCodeBits (bitOctets, defaultMask, mask) {
  var charArray = bitOctets.split("");
  var defaultBitCount = defaultMask.toString(2).split("").sum();
  var maskBitCount = mask.toString(2).split("").sum();
  var result = '<span class="netbits">';
  for (var i = 0; defaultBitCount > 0; i++) {
    if (charArray[i] != ".") {
      defaultBitCount--;
    }
    if (i > 50) {
      return false;
    }
  }
  result += charArray.slice(0,i).join("") + '</span><span class="subnetbits">';
  for (var j = 0; maskBitCount > 0; j++) {
    if (charArray[j] != ".") {
      maskBitCount--;
    }
    if (j > 50) {
      return false;
    }
  }
  result += charArray.slice(i,j).join("") + '</span><span class="hostbits">' + charArray.slice(j,charArray.length).join("") + '</span>';
  return result;
}

function toOctets(num, base) {
  var bitString = num.toString(2);
  var result = new Array();
  var bitArray = new Array();
  if (bitString.length > 32) {
    return false;
  }
  if (bitString.length < 32) {
    bitString = "0".repeat(32 - bitString.length) + bitString;
  }
  bitArray = bitString.split("");
  if (bitArray.length > 32) {
    return false;
  }
  if (bitArray.length < 32) {
    bitArray = "0".repeat(32 - bitArray.length) + bitArray
  }
  for (var i = 0; i < bitArray.length; i += 8) {
    result[i/8] = parseInt(bitArray.slice(i,i+8).join(""),2);
    if (base) {
      result[i/8] = result[i/8].toString(base).toUpperCase();
      if (base == 2 && result[i/8].length < 8) {
        result[i/8] = "0".repeat(8 - result[i/8].length) + result[i/8];
      }
      if (base == 16 && result[i/8].length < 2) {
        result[i/8] = "0" + result[i/8];
      }
    }
  }
  if (result.length < 4) {
    return "0.".repeat(4 - result.length) + result.join(".")
  }
  return result.join(".");
}

function showHideRow (rowNum, me) {
  var meObj = document.getElementById(me);
  var rowObj = document.getElementById("infotable").rows[rowNum];

  if (rowObj.style.display == "none") {
    rowObj.style.display = "";
    meObj.style.listStyle = "";
  }
  else {
    rowObj.style.display = "none";
    meObj.style.listStyle = "none";
  }
}

function showHideCol (colNum, me) {
  var meObj = document.getElementById(me);
  var rowObj = document.getElementById("infotable").rows;

  for (var i = 0; i < rowObj.length; i++) {
    var cell = rowObj[i].cells[colNum];
    if (cell.style.display == "none") {
      cell.style.display = "";
      meObj.style.listStyle = "";
    }
    else {
      cell.style.display = "none";
      meObj.style.listStyle = "none";
    }
  }
  return true;
}

function bitwiseRShift(shiftNum, shiftDist) {
  return shiftNum / Math.pow(2,shiftDist);
}

function bitwiseLShift(shiftNum, shiftDist) {
  return shiftNum * Math.pow(2,shiftDist);
}

function bitwiseAnd(num1, num2) {
  var resultArray = new Array();
  var bitArray1 = num1.toString(2).split("").reverse();
  var bitArray2 = num2.toString(2).split("").reverse();

  for (var i = 0; i < Math.max(bitArray1.length, bitArray2.length); i++) {
    if (bitArray1[i] == 1 && bitArray2[i] == 1) {
      resultArray[i] = 1;
    }
    else {
      resultArray[i] = 0;
    }
  }
  return parseInt(resultArray.reverse().join(""),2);
}

function bitwiseOr(num1, num2) {
  var resultArray = new Array();
  var bitArray1 = num1.toString(2).split("").reverse();
  var bitArray2 = num2.toString(2).split("").reverse();

  for (var i = 0; i < Math.max(bitArray1.length, bitArray2.length); i++) {
    if (bitArray1[i] == 1 || bitArray2[i] == 1) {
      resultArray[i] = 1;
    }
    else {
      resultArray[i] = 0;
    }
  }
  return parseInt(resultArray.reverse().join(""),2);
}

function bitwiseXor(num1, num2) {
  var resultArray = new Array();
  var bitArray1 = num1.toString(2).split("").reverse();
  var bitArray2 = num2.toString(2).split("").reverse();

  for (var i = 0; i < Math.max(bitArray1.length, bitArray2.length); i++) {
    if ((bitArray1[i] == 1 || bitArray2[i] == 1) && !(bitArray1[i] == 1 && bitArray2[i] == 1)) {
      resultArray[i] = 1;
    }
    else {
      resultArray[i] = 0;
    }
  }
  return parseInt(resultArray.reverse().join(""),2);
}

function bitwiseNot(num) {
  var bitArray = num.toString(2).split("");

  for (var i = 0; i < bitArray.length; i++) {
    if (bitArray[i] == 1) {
      bitArray[i] = 0;
    }
    else {
      bitArray[i] = 1;
    }
  }
  return parseInt(bitArray.join(""),2);
}

