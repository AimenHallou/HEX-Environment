const serverUrl = 'https://bkvreapmhhwq.usemoralis.com:2053/server'; //Server url from moralis.io
const appId = 'yjkLOuAuQBemzhPOfQOQkm1dmmAH3bWxj7jRoDKw'; // Application id from moralis.io

let currentTrade = {};
let currentSelectSide;
let tokens;
let userBalance = {};

const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

const tokenInput = document.getElementById('token_input');
const tokenList = document.getElementById('token_list');

async function init() {
    await Moralis.start({ serverUrl, appId });
    await Moralis.enableWeb3();
    getBalance();
    await listAvailableTokens();
    currentUser = Moralis.User.current();
    if (currentUser) {
        document.getElementById('swap_button').disabled = false;
    }
    openModal('from');
    selectToken(ethAddress)

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

function selectToken(address) {
    console.log(address, ' quick test');
    closeModal();
    console.log(tokens);
    currentTrade[currentSelectSide] = tokens[address];
    console.log(currentTrade);
    renderInterface();
    getQuote();
    checkBalance(address);
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
  userBalance.forEach(function (arrayItem) {
    if (arrayItem.symbol=== "ETH"){
      document.getElementById("eth_balance").innerHTML =Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000+" ETH &nbsp;";
      console.log(arrayItem.symbol)
    }
    if (arrayItem.symbol === tokens[address].symbol){
      console.log(currentSelectSide)
      if (currentSelectSide=="from"){
        document.getElementById("from_balance").innerHTML = "Balance: "+ Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000;
        document.getElementById("from_balance").style.visibility = "visible";
      } else {
        document.getElementById("to_balance").innerHTML = "Balance: "+ Math.round(Web3.utils.fromWei(arrayItem.balance)*1000000)/1000000;;
        document.getElementById("to_balance").style.visibility = "visible";
      }
    }
  });

}

async function login() {
    try {
        currentUser = Moralis.User.current();
        if (!currentUser) {
            currentUser = await Moralis.authenticate();
        }
        let address = Moralis.User.current().get('ethAddress');
        document.getElementById('login_button').style.visibility = 'hidden';
        document.getElementById('account-number').innerHTML = address.substring(0,6)+"..."+address.substring(address.length-4,address.length);
        document.getElementById('swap_button').disabled = false;
    } catch (error) {
        console.log(error);
    }
}

function openModal(side) {
    tokenInput.value = '';
    currentSelectSide = side;
    document.getElementById('token_modal').style.display = 'block';
}
function closeModal() {
    tokenInput.value = '';
    autocomplete();
    document.getElementById('token_modal').style.display = 'none';
}

async function getQuote() {
    if (!currentTrade.from || !currentTrade.to || !document.getElementById('from_amount').value) return;

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
//Test

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
document.getElementById('swap_button').onclick = trySwap;
