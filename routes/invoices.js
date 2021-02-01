const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');
const { database } = require('../db');

router.get('/', async (req, res, next) => {
	try {
		const results = await db.query(`SELECT id, comp_code FROM invoices`);
		return res.json({ invoices: results.rows });
	} catch (error) {
		return next(error);
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		const results = await db.query(
			`SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date, i.comp_code, c.name, c.description FROM invoices as i INNER JOIN companies as c ON (i.comp_code=c.code) WHERE id=$1`,
			[ id ]
		);
		if (results.rows.length === 0) {
			throw new ExpressError(`Cannot find invoice: ${id}`, 404);
		}
		const resultsInfo = results.rows[0];
		const invoiceInfo = {
			id        : resultsInfo.id,
			amt       : resultsInfo.amt,
			paid      : resultsInfo.paid,
			add_date  : resultsInfo.add_date,
			paid_date : resultsInfo.paid_date,
			company   : {
				code        : resultsInfo.comp_code,
				name        : resultsInfo.name,
				description : resultsInfo.description
			}
		};
		return res.send({ invoice: invoiceInfo });
	} catch (error) {
		return next(error);
	}
});

router.post('/', async (req, res, next) => {
	try {
		const { comp_code, amt } = req.body;
		const results = await db.query(
			`INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`,
			[ comp_code, amt ]
		);
		return res.status(201).json({ invoice: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.put('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		const { amt, paid } = req.body;
		let paidDate = null;

		// get current payment state of id
		const currentState = await db.query(`SELECT paid, paid_date FROM invoices WHERE id=$1`, [
			id
		]);

		// throw error if above query does not return a match
		if (currentState.rows.length === 0) {
			throw new ExpressError(`Cannot find invoice: ${id}`, 404);
		}
		const currDate = currentState.rows[0].paid_date;
		if (!currDate && paid) {
			// this is where the paid_date is null and the passed 'paid' data is true. This means its being marked as paid at this moment so update the paidDate
			paidDate = new Date();
		} else if (!paid) {
			// "paid" is false in request body let's make sure paidDate is null here
			paidDate = null;
		} else {
			// keep current paid_date since its not being updated
			paidDate = currDate;
		}

		const results = await db.query(
			`UPDATE invoices SET amt=$1, paid=$2, paid_date=$3 WHERE id=$4 RETURNING id, comp_code, amt, paid, add_date, paid_date`,
			[ amt, paid, paidDate, id ]
		);

		return res.json({ invoice: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.delete('/:id', async (req, res, next) => {
	try {
		const { id } = req.params;
		const results = await db.query(
			`DELETE FROM invoices WHERE id=$1 RETURNING id, comp_code, amt`,
			[ id ]
		);
		if (results.rows.length === 0) {
			throw new ExpressError(`Cannot find invoice: ${id}`, 404);
		}
		return res.json({ status: 'deleted' });
	} catch (error) {
		return next(error);
	}
});
module.exports = router;
