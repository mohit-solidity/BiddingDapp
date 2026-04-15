// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Bidding is ReentrancyGuard,Ownable,Pausable{
    uint256 public feeCollected =0;
    uint256 public totalItemsListed =0;
    struct seller{
        address sellerAddress;
        address buyerAddress;
        uint128 listingAmount;
        uint128 highestBid;
        uint64 startingTime;
        uint64 endingTime;
        string name;
        bool isActive;
    }
    //Mapping
    mapping(address=>seller[]) public sellerDetails;
    mapping(address=>bool) public hideDetails;
    mapping(address=>bool) public isSeller;
    mapping(address=>uint) public buyerRefund;

    //events
    event ItemListed(string name,address indexed seller,uint listingAmount,uint startTime,uint deadLine);
    event NewBiddingPlaced(string name,address indexed  sellerAddress,address indexed newBuyer, uint amount);


    constructor() Ownable(msg.sender) {}

    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }
    function registerAsSeller() public payable{
        require(!isSeller[msg.sender],"Already Registered");
        require(msg.value==0.0002 ether,"Must Send 0.0002 ETH For Valid Registration");
        isSeller[msg.sender] = true;
    }
    function hideYourItems() public {
        require(!hideDetails[msg.sender],"Already Hidden");
        hideDetails[msg.sender] = true;
    }
    function showYourItems() public{
        require(hideDetails[msg.sender],"Items are already public");
        hideDetails[msg.sender] = false;
    }
    function listItem(string memory _name,uint128 _listingAmount,uint _endTime) public payable{
        uint feeAmount = _listingAmount/100;
        require(_endTime>=1&&_endTime<=30,"Make Sure endTime Is Between 1 to 30 days");
        require(_listingAmount>0,"Listing Price Can't Be Zero");
        require(isSeller[msg.sender],"Please Register As Seller First");
        require(msg.value==feeAmount,"Must Pay Exactly Same Fee");
        sellerDetails[msg.sender].push(seller({
            sellerAddress:msg.sender,
            buyerAddress:address(0),
            listingAmount: _listingAmount,
            highestBid : 0,
            startingTime : uint64(block.timestamp),
            endingTime : uint64(block.timestamp+(_endTime*1 days)),
            name : _name,
            isActive : true
        }));
        feeCollected += feeAmount;
        totalItemsListed++;
        emit ItemListed(_name, msg.sender, _listingAmount, block.timestamp, uint64(block.timestamp+(_endTime*1 days)));
    }
    function makeBidding(uint index,address _seller) public payable whenNotPaused{
        seller storage s = sellerDetails[_seller][index];
        if(block.timestamp>s.endingTime){
            s.isActive=false;
            return;
        }
        require(index<sellerDetails[_seller].length,"Bid Not Found");
        require(block.timestamp<s.endingTime,"Event Already Ended");
        require(s.isActive,"Event Is Not Active");
        require(msg.value>=(s.highestBid +(s.highestBid*5/100)),"Bid Must Higher 5% Than Previous");
        if(s.highestBid==0){
            require(msg.value>s.listingAmount,"Amount Must Greater Than Listing Amount");
        }
        if(msg.value>s.highestBid){
            if (s.buyerAddress != address(0)) {
                buyerRefund[s.buyerAddress] += s.highestBid;
            }
            s.buyerAddress = msg.sender;
            s.highestBid = uint128(msg.value);
            if(s.endingTime-block.timestamp<600){
                s.endingTime = uint64(block.timestamp+600);
            }
        }
        emit NewBiddingPlaced(s.name, s.sellerAddress, s.buyerAddress, msg.value);
    }
    function claimRefund() external nonReentrant whenNotPaused{
        uint amount = buyerRefund[msg.sender];
        require(amount>0,"No Amount To Refund");
        buyerRefund[msg.sender] =0;
        (bool success,) = payable(msg.sender).call{value:amount}("");
        require(success,"Transaction Falied");
    }
    function claimSellAmount(uint index) public nonReentrant whenNotPaused{
        require(index<sellerDetails[msg.sender].length,"Bid Not Found");
        seller storage s = sellerDetails[msg.sender][index];
        require(block.timestamp>s.endingTime,"Event Hasn't Ended");
        require(msg.sender==s.sellerAddress,"Not The Owner");
        require(s.highestBid>0,"No Bid Placed");
        uint amount = s.highestBid;
        s.highestBid = 0;
        (bool success,) = payable(msg.sender).call{value:amount}("");
        require(success,"Transaction Failed");
    }
    function cancelBid(uint index) public whenNotPaused{
        seller storage s = sellerDetails[msg.sender][index];
        require(index<sellerDetails[msg.sender].length,"Bid Not Found");
        require(s.buyerAddress==address(0),"Event Already Has Bidders");
        require(block.timestamp<s.endingTime,"Event Already Ended");
        require(s.isActive,"Event Is Already Cancelled");
        s.isActive = false;
    }
    function seeItems(address _user) public view returns(seller[] memory){
        require(isSeller[_user],"User Is Not Registered");
        require(!hideDetails[_user],"User Restrict His Details From Viewing Publically");
        return sellerDetails[_user];
    }
    function feeWithdraw() public onlyOwner whenNotPaused{
        require(feeCollected>0,"No Fee Collected");
        feeCollected = 0;
        (bool success,) = payable(msg.sender).call{value:address(this).balance}("");
        require(success,"Transaction Failed");
    }
    receive() external payable {
        revert("Please Bid From Website");
     }
}
