const express = require('express');
const router = new express.Router();
const db = require('../db');
const ExpressError = require('../expressError');
const slugify = require('slugify');

router.get('/', async (req, res, next) => {
	try {
		const results = await db.query(`SELECT code, name FROM companies`);
		return res.json({ companies: results.rows });
	} catch (error) {
		return next(error);
	}
});

router.get('/:code', async (req, res, next) => {
	try {
		const companyResults = await db.query(
			`SELECT c.code, c.name, c.description, i.industry FROM companies AS c LEFT JOIN companies_industries AS ci ON c.code = ci.company_code LEFT JOIN industries AS i ON i.code = ci.industry_code WHERE c.code=$1;`,
			[ req.params.code ]
		);
		const invoiceResults = await db.query(
			`SELECT id, amt, paid FROM invoices WHERE comp_code=$1`,
			[ req.params.code ]
		);
		if (companyResults.rows.length === 0) {
			throw new ExpressError(`Can't find company with code of ${code}`, 404);
		}
		const { code, name, description } = companyResults.rows[0];
		const industries = companyResults.rows.map((r) => r.industry);
		const invoiceData = invoiceResults.rows;
		companyData = { code, name, description, industries };
		if (invoiceData.length > 0) {
			companyData.invoices = invoiceData;
		}

		return res.json({ company: companyData });
	} catch (error) {
		return next(error);
	}
});

router.post('/', async (req, res, next) => {
	try {
		const { name, description } = req.body;
		const code = slugify(name, { lower: true });
		const results = await db.query(
			`INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
			[ code, name, description ]
		);
		return res.status(201).json({ company: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.put('/:code', async (req, res, next) => {
	try {
		const code = req.params.code;
		const { name, description } = req.body;
		const results = await db.query(
			`UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description`,
			[ name, description, code ]
		);
		if (results.rows.length === 0) {
			throw new ExpressError(`Can't find company with code of ${code}`, 404);
		}
		return res.json({ company: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.delete('/:code', async (req, res, next) => {
	try {
		const { code } = req.params;
		const results = await db.query(
			`DELETE FROM companies WHERE code=$1 RETURNING code, name, description`,
			[ code ]
		);
		if (results.rows.length === 0) {
			throw new ExpressError(`Can't delete company with code of ${code}: not found`, 404);
		}
		return res.json({ status: 'deleted' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;
