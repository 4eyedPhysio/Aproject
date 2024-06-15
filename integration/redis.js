const {createClient} = require(`redis`);

const client = createClient({
    url: process.env.REDIS_URL
});

client.on(`connect`, ()=>{
    console.log(`redis client connected`);
});

client.on('error', (err)=>{
    console.log('Redis connection error: ' + err);
  });

const connect = () => {
    client.connect();
}

module.exports = {client, connect}