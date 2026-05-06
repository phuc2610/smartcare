require('mongoose').connect('mongodb+srv://Phuc26104:2785YaFdsluel5sI@cluster0.qdkccgc.mongodb.net/135t').then(async () => {
  const Reminder = require('./src/models/Reminder.js');
  const Medication = require('./src/models/Medication.js');
  const meds = await Medication.find({userId: '69fb1123c8c6919cdff706d1'});
  const r = await Reminder.find({medicationId: {'$in': meds.map(m=>m._id)}, status: 'PENDING'}).sort({scheduledTime:1});
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
});
