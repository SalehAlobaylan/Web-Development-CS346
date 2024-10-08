const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const LoanSchema = new Schema({

    ownerId: { type: String, required: true },
    partyId: { type: String, required: true },

    role: { type: String, enum: ['BORROWER', 'LENDER'], required: true },

    loanTitle: { type: String, required: true },

    loanDate: { type: Date, default: Date.now, required: true },
    
    loanNotes: { type: String }, 

    createdAt: { type: Date, default: Date.now }, 
});

LoanSchema.pre('remove', async function(next) {
    try {
        await mongoose.model('Transaction').deleteMany({ loanId: this._id });
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Loan', LoanSchema);