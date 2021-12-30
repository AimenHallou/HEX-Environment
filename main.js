const serverUrl = 'https://bkvreapmhhwq.usemoralis.com:2053/server'; //Server url from moralis.io
const appId = 'yjkLOuAuQBemzhPOfQOQkm1dmmAH3bWxj7jRoDKw'; // Application id from moralis.io

let currentTrade = {};
let currentSelectSide;
let tokens;
let userBalance = {};

const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const wEthAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const tokenInput = document.getElementById('token_input');
const tokenList = document.getElementById('token_list');

async function init() {
    await Moralis.start({ serverUrl, appId });
    changeText("Connect Wallet");
    await Moralis.enableWeb3();
    getBalance();
    await listAvailableTokens();
    currentUser = Moralis.User.current();
    if (currentUser) {
        document.getElementById('swap_button').disabled = false;
        login();
    }
    openModal('from');
    selectToken(ethAddress)
    await getPrice();
}

async function listAvailableTokens() {
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    });
    tokens = result.tokens;

    initTokenInput();
}

async function getBalance() {
  userBalance = await Moralis.Web3.getAllERC20();
  console.log(userBalance);
}
function changeText(newText) {
  document.getElementById("swap_button").innerHTML = newText;
}

function selectToken(address) {
    console.log(address, ' quick test');
    closeModal();
    console.log(tokens);
    currentTrade[currentSelectSide] = tokens[address];
    console.log(currentTrade);
    renderInterface();
    getQuote();
    checkBalance(address);
    if (currentSelectSide=="from"){
      getToPrice();
    }
    if (currentSelectSide=="to"){
      getFromPrice()
    }
}

function renderInterface() {
    if (currentTrade.from) {
        document.getElementById('from_token_img').src = currentTrade.from.logoURI;
        document.getElementById('from_token_text').innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        document.getElementById('to_token_img').src = currentTrade.to.logoURI;
        document.getElementById('to_token_text').innerHTML = currentTrade.to.symbol;
    }
}

function checkBalance (address){
  console.log("From ",tokens[address].symbol);
  console.log("User ",userBalance);
  var count = 0;
  userBalance.forEach(function (arrayItem) {
    if (arrayItem.symbol=== "ETH"){
      document.getElementById("eth_balance").innerHTML =Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000+" ETH &nbsp;";
      console.log(arrayItem.symbol)
    }
    if (arrayItem.symbol === tokens[address].symbol){
      count = 1;
      if (currentSelectSide=="from"){
        document.getElementById("from_balance").innerHTML = "Balance: "+ Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000;
        document.getElementById("from_balance").style.visibility = "visible";
      } else {
        document.getElementById("to_balance").innerHTML = "Balance: "+ Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000;;
        document.getElementById("to_balance").style.visibility = "visible";
      }
    }
  });
  if (count==0){
    if (currentSelectSide=="from"){
      document.getElementById("from_balance").style.visibility = "hidden";
    } else {
      document.getElementById("to_balance").style.visibility = "hidden";
    }
  }
}

async function login() {
    try {
        currentUser = Moralis.User.current();
        if (!currentUser) {
            currentUser = await Moralis.authenticate();
        }
        let address = Moralis.User.current().get('ethAddress');
        document.getElementById('account-number').innerHTML = address.substring(0,6)+"..."+address.substring(address.length-4,address.length);
        document.getElementById('swap_button').disabled = false;
        var elem = document.getElementById("login_button");
        return elem.parentNode.removeChild(elem);
    } catch (error) {
        console.log(error);
    }
}

function openModal(side) {
    tokenInput.value = '';
    currentSelectSide = side;
    document.getElementById('token_modal').style.display = 'block';
    tokenInput.focus();
}
function closeModal() {
    tokenInput.value = '';
    autocomplete();
    document.getElementById('token_modal').style.display = 'none';
    if (!currentTrade.to && currentTrade.from) {
      changeText("Enter an amount");
    }
}

async function getQuote() {
    if (!currentTrade.from || !currentTrade.to )
     return;
    if (document.getElementById('from_amount').value==0){
      document.getElementById('to_amount').value="";
    } else {
      let amount = Number(document.getElementById('from_amount').value * 10 ** currentTrade.from.decimals);

      const quote = await Moralis.Plugins.oneInch.quote({
          chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
          fromTokenAddress: currentTrade.from.address, // The token you want to swap
          toTokenAddress: currentTrade.to.address, // The token you want to receive
          amount: amount,
      });
      console.log(quote);
      document.getElementById('gas_estimate').innerHTML = quote.estimatedGas;
      document.getElementById('to_amount').value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
    }
}

function swapPositions(){
    if (currentTrade.from && currentTrade.to){
        temp = currentTrade.to.address;
        currentSelectSide = "to";
        selectToken(currentTrade.from.address);
        currentSelectSide = "from";
        selectToken(temp);
        console.log("working")
          getPrice()
    }
}
async function getPrice(){
    if (currentTrade.from){
      var val = document.getElementById('from_amount').value;
      if (val == 0){
        document.getElementById('from_price').style.visibility = "hidden";
      } else {
        if (currentTrade.from.address === ethAddress){
          let settings = {address: wEthAddress}
          let price = await Moralis.Web3API.token.getTokenPrice(settings);
          let string = "$"+(Math.round(price.usdPrice*100)/100)*val;
          console.log("this is the price"+string)
          document.getElementById('from_price').style.visibility = "visible";
          document.getElementById('from_price').innerHTML = string;
        } else {
          let settings = {address: currentTrade.from.address}
          let price = await Moralis.Web3API.token.getTokenPrice(settings);
          document.getElementById('from_price').style.visibility = "visible";
          document.getElementById('from_price').innerHTML = "$"+Math.round(price.usdPrice*100)/100;
        }
      }
    }
  }
async function getFromPrice(){
      var val = document.getElementById('from_amount').value;
      if (val == 0){
        document.getElementById('from_price').style.visibility = "hidden";
      } else {
        if (currentTrade.from.address === ethAddress){
        let settings = {address: wEthAddress}
        let price = await Moralis.Web3API.token.getTokenPrice(settings);
        let addedConst = price.usdPrice*val;
        let string = "$"+(Math.round(addedConst*100)/100);
        console.log("this is the price "+string)
        document.getElementById('from_price').style.visibility = "visible";
        document.getElementById('from_price').innerHTML = string;
      } else {
        let settings = {address: currentTrade.from.address}
        let price = await Moralis.Web3API.token.getTokenPrice(settings);
        let addedConst = price.usdPrice*val;
        let string = "$"+(Math.round(addedConst*100)/100);
        document.getElementById('from_price').style.visibility = "visible";
        document.getElementById('from_price').innerHTML = string;
      }
    }
    if (currentTrade.to){
      if(val==0){
        document.getElementById('to_price').style.visibility = "hidden";
      } else {
        if (currentTrade.to.address === ethAddress){
          let settings = {address: wEthAddress}
          let price = await Moralis.Web3API.token.getTokenPrice(settings);
          let addedConst = price.usdPrice*val;
          let string = "$"+(Math.round(addedConst*100)/100);
          console.log("this is the second price "+string)
          document.getElementById('to_price').style.visibility = "visible";
          document.getElementById('to_price').innerHTML = string;
      } else {
        let settings = {address: currentTrade.to.address}
        let price = await Moralis.Web3API.token.getTokenPrice(settings);
        let addedConst = price.usdPrice*val;
        let string = "$"+(Math.round(addedConst*100)/100);
        document.getElementById('to_price').style.visibility = "visible";
        document.getElementById('to_price').innerHTML = string;
      }
      }
  }
}

async function getToPrice() {
    var val = document.getElementById('to_amount').value;
    if (val == 0) {
      document.getElementById('to_price').style.visibility = "hidden";
    } else {
      if (currentTrade.to.address === ethAddress){
        let settings = {address: wEthAddress}
        let price = await Moralis.Web3API.token.getTokenPrice(settings);
        let addedConst = price.usdPrice*val;
        let string = "$"+(Math.round(addedConst*100)/100);
        console.log("this is the price "+string)
        document.getElementById('to_price').style.visibility = "visible";
        document.getElementById('to_price').innerHTML = string;
    } else {
      let settings = {address: currentTrade.to.address}
      let price = await Moralis.Web3API.token.getTokenPrice(settings);
      let addedConst = price.usdPrice*val;
      let string = "$"+(Math.round(addedConst*100)/100);
      document.getElementById('to_price').style.visibility = "visible";
      document.getElementById('to_price').innerHTML = string;
    }
    if (val==0){
      document.getElementById('from_price').style.visibility = "hidden";
    } else {
      if (currentTrade.from.address === ethAddress){
        let settings = {address: wEthAddress}
        let price = await Moralis.Web3API.token.getTokenPrice(settings);
        let addedConst = price.usdPrice*val;
        let string = "$"+(Math.round(addedConst*100)/100);
        console.log("this is the second price "+string)
        document.getElementById('from_price').style.visibility = "visible";
        document.getElementById('from_price').innerHTML = string;
    } else {
      let settings = {address: currentTrade.from.address}
      let price = await Moralis.Web3API.token.getTokenPrice(settings);
      let addedConst = price.usdPrice*val;
      let string = "$"+(Math.round(addedConst*100)/100);
      document.getElementById('from_price').style.visibility = "visible";
      document.getElementById('from_price').innerHTML = string;
    }
  }
}
}
async function trySwap() {
    let address = Moralis.User.current().get('ethAddress');
    let amount = Number(document.getElementById('from_amount').value * 10 ** currentTrade.from.decimals);
    if (currentTrade.from.symbol !== 'ETH') {
        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
            chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            fromAddress: address, // Your wallet address
            amount: amount,
        });
        console.log(allowance);
        if (!allowance) {
            await Moralis.Plugins.oneInch.approve({
                chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
                tokenAddress: currentTrade.from.address, // The token you want to swap
                fromAddress: address, // Your wallet address
            });
        }
    }
    try {
        let receipt = await doSwap(address, amount);
        alert('Swap Complete');
    } catch (error) {
        console.log(error);
    }
}

function doSwap(userAddress, amount) {
    return Moralis.Plugins.oneInch.swap({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount: amount,
        fromAddress: userAddress, // Your wallet address
        slippage: 1,
    });
}

// initializes token input field and its event listeners
 function initTokenInput() {
    // calls autocomplete on init to fill token list with all tokens
    autocomplete();

    /*execute a function when someone writes in the text field:*/
    tokenInput.addEventListener('input', function (e) {
        // updates token list on each input
        autocomplete(e.target.value);
    });
    document.getElementById('from_amount').addEventListener('input', function (e){
      console.log(document.getElementById("swap_button").value);
      if (document.getElementById("swap_button").value == 'Enter an amount'){
          console.log("working")
      }
       getQuote();
       getFromPrice();
    });
    document.getElementById('to_amount').addEventListener('input', function (e){
       getQuote();
       getToPrice();
    });
}

function autocomplete(val = '') {
    tokenList.innerHTML = '';

    const filter = (address) => {
        return tokens[address].symbol.substr(0, val.length).toUpperCase() == val.toUpperCase();
    };

    const sort = (a, b) => {
        if (tokens[a].symbol < tokens[b].symbol) {
            return -1;
        }
        if (tokens[a].symbol > tokens[b].symbol) {
            return 1;
        }
        return 0;
    };

    Object.keys(tokens)
        .filter(filter)
        .sort(sort)
        .map((address) => {
            const tokenElement = document.createElement('DIV');

            const html = `<img class="token_list_img" src="${tokens[address].logoURI}"><span class="token_list_text"><strong>${tokens[address].symbol.substr(
                0,
                val.length
            )}</strong>${tokens[address].symbol.substr(val.length)}</span>`;

            tokenElement.className = 'token_row';
            tokenElement.innerHTML = html;

            tokenElement.setAttribute('data-address', address);

            tokenElement.addEventListener('click', function (e) {
                selectToken(address);
                closeModal();
            });
            tokenList.appendChild(tokenElement);
        });
}

init();

document.getElementById('modal_close').onclick = closeModal;
document.getElementById('from_token_select').onclick = () => {
    openModal('from');
};
document.getElementById('to_token_select').onclick = () => {
    openModal('to');
};
document.getElementById('login_button').onclick = login;
document.getElementById('from_amount').onblur = getQuote;
document.getElementById('flip_switch').onclick = swapPositions;
document.getElementById('swap_button').onclick = trySwap;
