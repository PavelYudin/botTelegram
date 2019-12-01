const token = null;
const TelegramBot = require('node-telegram-bot-api')
const Agent = require('socks5-https-client/lib/Agent')
const MongoClient = require("mongodb").MongoClient;
const bot = new TelegramBot(token, {
    polling: true,
    request: {
        agentClass: Agent,
        agentOptions: {
        //    socksHost: 'undefined',
        //    socksPort: undefined
        }
    }
})

class OPS{
	constructor(index){
		this.name=index,
		this.date=[]
	}
	static setDate(obj){
		let d=new Date();
		d=d.setHours(0,0,0,0);
		obj.date.push(d);
		return obj;
	}
	static check(index){
		if(index.length != 6 || typeof +index !== 'number') return false;
		const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
		mongoClient.connect(function(err, client){
			if(err) console.log(err.message);
			const db = client.db("ops");
			const collection = db.collection("indexes");
			collection.find({name:index}).toArray(function(err, res){
				if(err) console.log(err);
				if(res.length){
					res=OPS.setDate(res[res.length-1]);
					collection.updateOne({[Object.keys(res)[0]]:res[Object.keys(res)[0]]},
						{$set:{date:res.date}},
						(err,res)=>{
							if(err) console.log(err.message)
						});
				}else{
					let obj=new OPS(index);
					obj=OPS.setDate(obj);
					collection.insertOne(obj,(err,res)=>{
						if(err) console.log(err.message)
					})
				}			
				client.close();
			});
		});
		return true;
	}
}
bot.onText(/\список опс с (\d{1,2}.\d{2}.\d{4}) по (\d{1,2}.\d{2}.\d{4})/, (msg, match) => {
	try{
		let date1=match[1];
		let date2=match[2];	
		const chatId = msg.chat.id;
		function date(date){
			let arr=date.split('.');
			let buf=arr[0];
			arr[0]=arr[1];
			arr[1]=buf;
			b=new Date(arr.join('.'));
			b.setHours(0,0,0,0);
			return new Date(b)=='Invalid Date'?undefined:b;
		}
		date2=date(date2);
		date1=date(date1);
		let resp='';
		if(date2>=date1){
			const mongoClient = new MongoClient("mongodb://localhost:27017/", { useNewUrlParser: true });
			mongoClient.connect(function(err, client){
				if(err) console.log(err.message);
				const db = client.db("ops");
				const collection = db.collection("indexes");
				collection.find().toArray(function(err, res){
					const result=res.map(obj=>{
						const resDate=obj.date.filter(item=>{
							if(item>=date1 && item<=date2) return item;
						});
						if(resDate.length) return {name:obj.name,date:resDate};
					});
					result.forEach(item=>{if(item) resp+=item.name+' - '+item.date.length+'\n'});
					if(!resp) resp='не найдено';
					client.close();
					bot.sendMessage(chatId,resp);
				});
			});
		}else{
			resp='не корректная дата';
			bot.sendMessage(chatId,resp);
		}
	}catch(err){console.log(err.message);}
});
bot.onText(/\опс (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; 
    try{
 		if (OPS.check(resp)) {bot.sendMessage(chatId, 'добавлено');}
 	}catch(err){console.log(err.message)}
});

