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
	// [✓] Fill Limit Order
	// [✓] Charge fees

contract Exchange {

	using SafeMath for uint256; 

	// state variables
	address public feeReceiver; 					// account address that receives exchange usage fees
	uint256 public makerFee;						// sets maker fee to 1 %
	uint256 public takerFee;						// sets taker fee to 2 %
	address constant etherAddress = address(0); 	// uses the 0 address as a placeholder token for native ether
	uint256 public orderNonce;						// counter that is zero by default and incremented for each new order on dex smart contract
	address payable public charity;					// charity address

	// events
	event Deposit(address token, address maker, uint256 amount, uint256 balance);																				// general erc20 deposit event structure
	event Withdraw(address token, address maker, uint256 amount, uint256 balance);																				// general erc20 withdraw event structure
	event Order(uint256 id, address maker, address tokenBuy, address tokenSell, uint256 amountBuy, uint256 amountSell, uint256 timestamp);						// customized order event
	event Cancelled(uint256 id, address maker, address tokenBuy, address tokenSell, uint256 amountBuy, uint256 amountSell, uint256 timestamp);					// customized cancel order event
	event Trade(uint256 id, address maker, address taker, address tokenBuy, address tokenSell, uint256 amountBuy, uint256 amountSell, uint256 timestamp);		// customized trade event

	mapping(address => mapping(address => uint256)) public tokens;			// first 'address' key tracks token address, 2nd 'address' key tracks maker account that deposited token
	mapping (uint256 => orderObject) public orders;							// list of all order objects currently stored on eth smart contract dex
	mapping(uint256 => bool) public ordersCancelled;						// tracks which order ids are cancelled via this independent mapping
	mapping(uint256 => bool) public ordersFilled;							// tracks which order ids have already been filled via this independent mapping

	// constructor instantiates decentralized exchange smart contract
	constructor(address _feeReceiver, uint256 _makerFee, uint256 _takerFee) public {
		feeReceiver = _feeReceiver;
		makerFee = _makerFee;
		takerFee = _takerFee;
		charity = msg.sender;
	}

	// defines charity restrictions usable on functions
	modifier onlyCharity() {
    	require(msg.sender == charity);
   	 	_;
  	}

	function depositEther() payable public {
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].add(msg.value);		// updates balance to add ether to maker's account
		emit Deposit(etherAddress, msg.sender, msg.value, tokens[etherAddress][msg.sender]);	// emits deposit event
	}

	function withdrawEther(uint _amount) payable public {
		require(tokens[etherAddress][msg.sender] >= _amount);									// ensures maker can't withdraw more ether than they own
		tokens[etherAddress][msg.sender] = tokens[etherAddress][msg.sender].sub(_amount);		// subtracts ether balance available to withdraw for current maker
		msg.sender.transfer(_amount);															// transfers ether to maker
		emit Withdraw(etherAddress, msg.sender, _amount, tokens[etherAddress][msg.sender]);		// emits withdrawal event
	} 

	function depositToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure token deposited is not native ether		
		require (Token(_token).transferFrom(msg.sender, address(this), _amount));	// send tokens from the maker's wallet to this exchange contract	
		tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);		// manages deposit and updates balance		
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits deposit event
	}

	function withdrawToken(address _token, uint256 _amount) public {
		require (_token != etherAddress);											// ensure erc20 token is being withdrawn and not native ether
		require(tokens[_token][msg.sender] >= _amount);								// ensure maker doesn't withdraw more tokens than they own
		tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);		// safely subtracts balance with zerppelin safemaths
		require(Token(_token).transfer(msg.sender, _amount));						// requires the transfer of tokens to the maker
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);		// emits withdrawal event
	}

	// model orders with a custom struct called orderObject
	struct orderObject {
		uint256 id;
		address maker;
		address tokenBuy;
		address tokenSell;
		uint256 amountBuy;
		uint256 amountSell;
		uint256 timestamp;
	}

	function balanceOf(address _token, address _maker) public view returns (uint256) {
		return tokens[_token][_maker];
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
		require(address(orderTemp.maker) == msg.sender);													// ensures maker can only cancel their own orders
		
		ordersCancelled[_id] = true;
		emit Cancelled(orderTemp.id, msg.sender, orderTemp.tokenBuy, orderTemp.tokenSell, orderTemp.amountBuy, orderTemp.amountSell, now);
	}

	// retrieve orders from storage and fill them
	function fillOrder(uint256 _id) public {
		require(_id > 0 && _id <= orderNonce);																												// ensure valid order id greater than 0 and less than globally incremented orderNonce
		require(!ordersCancelled[_id]);																														// ensures order is not one that has been cancelled
		require(!ordersFilled[_id]);																														// ensures order is not on  that has already been filled
		orderObject storage orderInterim = orders[_id];																										// matched order object retrieved
		commitTrade(orderInterim.id, orderInterim.maker, orderInterim.tokenBuy, orderInterim.tokenSell, orderInterim.amountBuy, orderInterim.amountSell);	// passes order to internal trade function
		ordersFilled[orderInterim.id] = true;																												// marks order as filled
	}

	function commitTrade(uint256 _orderID, address _maker, address _tokenBuy, address _tokenSell, uint256 _amountBuy, uint256 _amountSell) internal {
		uint256 _takerFee = _amountSell.mul(takerFee).div(100);																// taker fee set to just 1 %

		// taker == msg.sender
		tokens[_tokenBuy][msg.sender] = tokens[_tokenBuy][msg.sender].sub(_amountBuy.add(_takerFee));						// maker's ask is subtracted from taker along with a negligible taker fee
		tokens[_tokenSell][_maker] = tokens[_tokenSell][_maker].sub(_amountSell);											// taker's bid is subtracted from maker
		tokens[_tokenBuy][feeReceiver] = tokens[_tokenBuy][feeReceiver].add(_takerFee);										// dex exchange receives taker fee for maintenance costs
		tokens[_tokenBuy][_maker] = tokens[_tokenBuy][_maker].add(_amountBuy);												// taker's ask is added to maker
		tokens[_tokenSell][msg.sender] = tokens[_tokenSell][msg.sender].add(_amountSell);									// maker's bid is added to taker

		// emit trade event
		emit Trade(_orderID, _maker, msg.sender, _tokenBuy, _tokenSell, _amountBuy, _amountSell, now);
	}

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