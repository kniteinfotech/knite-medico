const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('./auth');

router.use(authenticateToken);

// Real-time Store KPI metrics (Owner mobile & web view)
router.get('/overview', async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    // 1. Today's sales
    const todayRes = await pool.query(
      `SELECT 
         COALESCE(SUM(grand_total), 0) as today_sales,
         COUNT(id) as today_invoices,
         COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN grand_total ELSE 0 END), 0) as cash_sales,
         COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN grand_total ELSE 0 END), 0) as upi_sales
       FROM medico.invoices 
       WHERE tenant_id = $1 AND created_at >= CURRENT_DATE`,
      [tenantId]
    );

    // 2. Month sales
    const monthRes = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as month_sales, COUNT(id) as month_invoices
       FROM medico.invoices 
       WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    );

    // 3. Stock metrics
    const stockRes = await pool.query(
      `SELECT 
         COUNT(id) as total_products,
         COALESCE(SUM(stock_qty * sale_price), 0) as stock_valuation,
         COUNT(CASE WHEN stock_qty <= min_stock AND is_deleted = false THEN 1 END) as low_stock_count,
         COUNT(CASE WHEN expiry_date <= (CURRENT_DATE + INTERVAL '60 days') AND is_deleted = false THEN 1 END) as near_expiry_count
       FROM medico.medicines 
       WHERE tenant_id = $1 AND is_deleted = false`,
      [tenantId]
    );

    // 4. Last 7 days sales trend
    const trendRes = await pool.query(
      `SELECT 
         to_char(created_at, 'YYYY-MM-DD') as day,
         COALESCE(SUM(grand_total), 0) as total
       FROM medico.invoices
       WHERE tenant_id = $1 AND created_at >= (CURRENT_DATE - INTERVAL '6 days')
       GROUP BY to_char(created_at, 'YYYY-MM-DD')
       ORDER BY day ASC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        today: todayRes.rows[0],
        month: monthRes.rows[0],
        inventory: stockRes.rows[0],
        trend: trendRes.rows
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics metrics' });
  }
});

module.exports = router;
