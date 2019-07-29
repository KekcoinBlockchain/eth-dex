pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Token.sol";

// Deposit & Withdraw Funds
// Handle Trades - Charge Peers

// To Do List:
	// [✓] Set the fee account
	// [✓] Deposit Ether
	// [✓] Withdraw Ether
	// [✓] Deposit Tokens
	// [✓] Withdraw Tokens
	// [✓] Check Balances
	// [✓] Make Limit Order
	// [✓] Cancel Limit Order
	// [] Fill Limit Order
	// [] Charge fees

contract Exchange {

	using SafeMath for uint256; 

	// state variables
	address public feeRecevier; 					// account address that receives exchange usage fees
	uint256 public feePercent; 						// sets fee percentage taken by exchange
	address constant etherAddress = address(0); 	// uses the 0 address as a placeholder token for native ether
	uint256 public orderNonce;						// counter that is zero by default and incremented for each new order on dex smart contract
	address payable public charity;					// charity address

	// events
	event Deposit(address token, address user, uint256 amount, uint256 balance);																	// general erc20 deposit event structure
	event Withdraw(address token, address user, uint256 amount, uint256 balance);																	// general erc20 withdraw event structure
	event Order(uint256 id, address user, address tokenBuy, address tokenSell, uint256 amountBuy, uint256 amountSell, uint256 timestamp);			// customized order event
	event Cancelled(uint256 id, address user, address tokenBuy, address tokenSell, uint256 amountBuy, uint256 amountSell, uint256 timestamp);		// customized cacel order event

	mapping(address => mapping(address => uint256)) public tokens;			// first 'address' key tracks token address, 2nd 'address' key tracks user account that deposited token
	mapping (uint256 => orderObject) public orders;							// list of all order objects currently stored on eth smart contract dex
	mapping(uint256 => bool) public ordersCancelled;

	// constructor instantiates decentralized exchange smart contract
	constructor(address _feeReceiver, uint256 _feePercent) public {
		feeRecevier = _feeReceiver;
		feePercent = _feePercent;
		charity = msg.sender;
	}

	// defines charity restrictions usable on functions
	modifier onlyCharity() {
    	require(msg.sender == charity);
   	 	_;
  	}

	function depositEther() payable public {
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].add(msg.value);		// updates balance to add ether to user's account
		emit Deposit(etherAddress, msg.sender, msg.value, tokens[etherAddress][msg.sender]);	// emits deposit event
	}

	function withdrawEther(uint _amount) payable public {
		require(tokens[etherAddress][msg.sender] >= _amount);									// ensures user can't withdraw more ether than they own
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].sub(_amount);		// subtracts ether balance available to withdraw for current user
		msg.sender.transfer(_amount);															// transfers ether to user
		emit Withdraw(etherAddress, msg.sender, _amount, tokens[etherAddress][msg.sender]);		// emits withdrawal event
	} 

	function depositToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure token deposited is not native ether		
		require (Token(_token).transferFrom(msg.sender, address(this), _amount));	// send tokens from the user's wallet to this exchange contract	
		tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);		// manages deposit and updates balance		
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits deposit event
	}

	function withdrawToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure erc20 token is being withdrawn and not native ether
		require(tokens[_token][msg.sender] >= _amount);								// ensure user doesn't withdraw more tokens than they own
		tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);		// safely subtracts balance with zerppelin safemaths
		require(Token(_token).transfer(msg.sender, _amount));						// requires the transfer of tokens to the user
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits withdrawal event
	}

	// model orders with a custom struct called orderObject
	struct orderObject {
		uint256 id;
		address user;
		address tokenBuy;
		address tokenSell;
		uint256 amountBuy;
		uint256 amountSell;
		uint256 timestamp;
	}

	function balanceOf(address _token, address _user) public view returns (uint256) {
		return tokens[_token][_user];
	}

	// add orders to storage
	function makeOrder(address _tokenBuy, address _tokenSell, uint256 _amountBuy, uint256 _amountSell) public {
		orderNonce = orderNonce.add(1);																						// increments order counter by one
		orders[orderNonce] = orderObject(orderNonce, msg.sender, _tokenBuy, _tokenSell, _amountBuy, _amountSell, now);		// now = current Epoch time in seconds
		emit Order(orderNonce, msg.sender, _tokenBuy, _tokenSell, _amountBuy, _amountSell, now);							// triggers order event to rest of ethereum
	}

	// cancel orders 
	function cancelOrder(uint256 _id) public {
		orderObject storage orderTemp = orders[_id];														// retrieves order in question and explicitly commits to storage
		require(orderTemp.id == _id);																		// ensures returned order object is not a blank struct with default values
		require(address(orderTemp.user) == msg.sender);														// ensures user can only cancel their own orders
		
		ordersCancelled[_id] = true;
		emit Cancelled(orderTemp.id, msg.sender, orderTemp.tokenBuy, orderTemp.tokenSell, orderTemp.amountBuy, orderTemp.amountSell, now);
	}

	// retrieve orders from storage

	function() payable external {}																							// directly sent ether will be donated to charity												

	// chosen charity can be donated to for a noble cause
	function donate () public onlyCharity returns(bool success) {
    	charity.transfer(address(this).balance);
    	return true;
	}

	// charities can be switched using this function
    function transferCharity(address payable newCharity) public onlyCharity {
	    require(newCharity != address(0));
	    charity = newCharity;
  	}
}



