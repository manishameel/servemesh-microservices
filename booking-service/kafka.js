const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  console.log('Kafka producer connected');
}

async function sendEvent(topic, message) {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}

module.exports = { connectProducer, sendEvent };