import { Client, GatewayIntentBits } from 'discord.js';
import { dbconnection } from './config/dbconnection';
import { transferTestToken } from './transfer';
import { DISCORD_TOKEN, BOT_ID, CHANNEL_Id } from './config/config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', (message) => {

    //check if author is bot, then return
    if (message.author.id === BOT_ID)
        return;

    //check channel is 'facuet' and it contains "$request", then send reponse 
    if ((message.channelId === CHANNEL_Id) && (message.content.slice(0,8) === "$request")) {
        const wallet_address = message.content.slice(9);

        // create connection for database
        const connection = dbconnection();

        // check if the number of requests is more that 5000
        const totalQuery = `SELECT COUNT(*) as num
                            FROM tb_faucet_history
                            WHERE tb_faucet_history.wallet_address = '${wallet_address}'`;
        connection.query(totalQuery, (err, result, fields) => {

            if (err) throw err;
            
            if (result[0].num > 5000) {
                connection.end();
                return message.reply("You are limited less than 5000");
            }

            const currentTime = new Date();

            const date = ("0" + currentTime.getDate()).slice(-2);
            const month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
            const year = currentTime.getFullYear();

            const hours = currentTime.getHours();
            const minutes = currentTime.getMinutes();
            const seconds = currentTime.getSeconds();

            const requestDate = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

            //check last request time 
            const lastRequestTimeQuery = `select * 
                                        from tb_faucet_history 
                                        WHERE tb_faucet_history.wallet_address = '${wallet_address}' 
                                        ORDER BY tb_faucet_history.id 
                                        DESC 
                                        LIMIT 1;`
            connection.query(lastRequestTimeQuery, async (err, result, fields) => {

                if (err) throw err;

                if (result[0] != undefined) {
                    const last_request_date = Date.parse(result[0].request_date);
                    if (Date.now() - last_request_date < 4 * 1000 * 3600) {
                        connection.end();
                        return message.reply("Please try again later");
                    }
                }

                const res = await transferTestToken(wallet_address)
                if (res === false) {
                    connection.end();
                    return message.reply("Something wrong");
                }

                //insert history to database
                const historyInsertQuery = `INSERT INTO tb_faucet_history (request_date, wallet_address)
                                            VALUES ('${requestDate}', '${wallet_address}')`
                connection.query(historyInsertQuery, (err, result) => {

                    if (err) throw err;

                    connection.end();
                    return message.reply("Successfully added   " + "`$tx_info " + res + "`");
                })
            })
        });
    }
})

client.login(DISCORD_TOKEN);
