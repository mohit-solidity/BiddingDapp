import { useEffect, useState } from "react";
import "./App.css";
import { BrowserProvider, ethers } from "ethers";
function App() {
  const [userAddress,setUserAddress] = useState("");
  const [contract,setContract] = useState(null);
  const [feesCollected,setFeeCollected] = useState(0);
  const [isSeller,setIsSeller] = useState(false);
  const [totalItemsListed,setTotalItemsListed] = useState(0);
  const [itemName,setItemname] = useState("");
  const [itemListingPrice,setItemListingPrice] = useState(0);
  const [itemDeadline,setItemDeadline] = useState(0);
  const [searchUserAddress,setSearchuserAddress] = useState(null);
  const [searchedUserItems,setSearchedUserItems] = useState([]);
  const [biddingPrice,setBiddingprice] = useState(0);

  let abi = ["function RegisterAsSeller() public payable",
             "function feeCollected() public view returns(uint256)",
             "function isSeller(address user) public view returns(bool)",
             "function sellerItems(address user) public view returns(uint256)",
             "function totalItemsListed() public view returns(uint256)",
             "function listItem(string memory _name,uint _listingPrice,uint deadline) public payable",
             "function makeBidding(address _seller,uint index) public payable",
             "function viewItems(address) view returns (tuple(address sellerAddress,address newOwner,uint256 createdAt,uint256 endTime,uint256 listingPrice,uint256 highestBid,bool isActive,string itemName)[])",
  ];
  let ca = "0xabf29377141c4ff401f5474886FBF2AB6E12DE0F";

  useEffect(()=>{
    getFee();
  },[contract,userAddress]);


  async function connectWallet() {
    if(window.ethereum){
      try{
        let provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts",[]);
        let signer = await provider.getSigner();
        let newContract = new ethers.Contract(ca,abi,signer);
        let address = await signer.getAddress();
        setUserAddress(address);
        setContract(newContract);
        alert("Wannet Connected To : "+address);
      }catch(err){
        alert(`Error : ${err.reason||err.message||JSON.stringify(err)}`);
      }
    }else{
      alert("No Wallet Found");
    }
  }
  async function getFee(){
    if(!contract) return;
    let fee = await contract.feeCollected();
    let seller = await contract.isSeller(userAddress);
    const totalItems = await contract.totalItemsListed();
    setFeeCollected(ethers.formatEther(fee));
    setIsSeller(seller);
    setTotalItemsListed(totalItems);
  }
  async function RegisterAsSeller(){
    if(!contract){
      alert("Please Connect Wallet First");
      return;
    }else{
      if(isSeller){
        alert("Already Registered");
        return;
      }
      try{
        let tx = await contract.RegisterAsSeller({value:ethers.parseEther("0.03")});
        await tx.wait();
        getFee();
        alert("Registration Successful");
      }catch(err){
        alert(`Error : ${err.info.error.message||err.message||JSON.stringify(err)}`);
      }
    }
  }
  async function listItem(){
    if(!contract){
      alert("Please Connect Wallet First");
      return;
    }else{
      if(!isSeller){
        alert("Please Register As Seller First");
        return;
      }else{
        try{
          if (
            !itemName ||
            isNaN(itemListingPrice) || itemListingPrice <= 0 ||
            isNaN(itemDeadline) || itemDeadline <= 0 ||
            !Number.isInteger(Number(itemDeadline))
          ) {
            alert("Make Sure You Enter Correct Inputs");
            return;
          }else{
            let tx = await contract.listItem(itemName,ethers.parseEther(String(itemListingPrice)),itemDeadline,{value:ethers.parseEther("0.02")});
            await tx.wait();
            getFee();
            alert("Item Listed Successfully");
          }
        }catch(err){
          alert(`Error : ${err.reason||err.message||JSON.stringify(err)}`);
        }
      }
    }
  }
  async function viewItems(){
    if(!contract){
      alert("Pease Connect Wallet First");
      return;
    }else{
      try{
        if(!searchUserAddress){
          alert("Please Enter User Address");
          return;
        }
        const sellerItems = await contract.sellerItems(searchUserAddress.trim());
        if(sellerItems===0){
          alert("Seller Has No Listed Items");
          return;
        }
        const data = await contract.viewItems(searchUserAddress.trim());
        
        let formattedData = data.map((item)=>({
          itemName:item.itemName,
          sellerAddress: item.sellerAddress,
          createdAt : new Date(Number(item.createdAt)*1000).toLocaleString(),
          endTime: new Date(Number(item.endTime)*1000).toLocaleString(),
          listingPrice : ethers.formatEther(item.listingPrice),
          highestBid : ethers.formatEther(item.highestBid),
          newOwner : item.newOwner,
          isActive : item.isActive,
        }))
        setSearchedUserItems(formattedData);
      }catch(err){
        alert(`Error : ${err.reason||err.message||JSON.stringify(err)}`);
      }
    }
  }
  async function makeBidding(sellerAddress,index){
    if(!contract){
      alert("Pease Connect Wallet First");
      return;
    }else{
      try{
        if(!biddingPrice){
          alert("Please Enter Some Value");
          return;
        }
        let tx = await contract.makeBidding(sellerAddress,index,{value:ethers.parseEther(biddingPrice)});
        await tx.wait();
        alert("Transaction Successful");
        viewItems();
      }catch(err){
        alert(`Error : ${err.Error||err.info.error.message||err.reason||err.message||JSON.stringify(err)}`)
      }
    }
  }
  return (
    <div className="App">
      <header className="App-header">
        <div style={{ marginBottom: 12 }}>
          <div className="At-Right">
            <p>Fee Colledted : {feesCollected} ETH</p>
            <p>Total Items Listed : {totalItemsListed}</p>
            <p>{userAddress?"Wallet Address : "+userAddress:"Not Connected"}</p>
            <p>{isSeller?"Seller : ✅":"Seller : ❌"}</p>
          </div>
          <div className="connect-wallet">
            <button onClick={connectWallet}>Connect Wallet</button><span /><br/>
          </div>
          <div className="register">
            <button onClick={RegisterAsSeller}>Register As Seller</button>
          </div>
          <div className="Inputs">
            <input type="text" onChange={(e)=>setItemname(e.target.value)} placeholder="Item Name" /><br/>
            <input type="number" onChange={(e)=>setItemListingPrice(e.target.value)} placeholder="Listing Price (In ETH)" /><br/>
            <input type="number" onChange={(e)=>setItemDeadline(e.target.value)} placeholder="Item DeadLine" />
            <div className="List-Item">
              <button onClick={listItem}>List Item(0.02 ETH)</button>
            </div>
          </div>
          <div className="search-user">
            <input type="text" onChange={(e)=>setSearchuserAddress(e.target.value)} placeholder="User Address" />
            <div className="search-button">
              <button onClick={viewItems}>View user Items</button>
            </div>
          </div>
          <div className="user-items">
            {searchedUserItems.length>0?searchedUserItems.map((item,index)=>(
              <div className="items" key={index}>
                <p><b>Item Name : </b>{item.itemName}</p>
                <p><b>Seller Address : </b>{item.sellerAddress}</p>
                <p><b>Created At : </b>{item.createdAt}</p>
                <p><b>Ending At : </b>{item.endTime}</p>
                <p><b>Listing Price : </b>{item.listingPrice} ETH</p>
                <p><b>Highest Bid : </b>{item.highestBid} ETH</p>
                <p><b>new Owner(Highest Bidder) : </b>{item.newOwner}</p>
                <p><b>Active : </b>{item.isActive}</p>
                <input type="number" onChange={(e)=>setBiddingprice(e.target.value)} placeholder="New Bidding Price" />
                <button onClick={()=>makeBidding(item.sellerAddress,index)}>Make New Bidding</button>
              </div>
            )):null}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
