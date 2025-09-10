# MANUAL SYSTEM TEST CHECKLIST

## 🔐 Authentication Tests
- [ ] Login page loads: https://vbmstest1.netlify.app/login.html
- [ ] Can login with admin credentials
- [ ] Can login with customer credentials
- [ ] Proper role-based redirect after login

## ⚡ Admin Dashboard Tests
- [ ] Admin dashboard loads: https://vbmstest1.netlify.app/admin-main-dashboard.html
- [ ] Date/time displays correctly
- [ ] Statistics cards show data
- [ ] Theme toggle works
- [ ] VAPI widget loads
- [ ] User management table shows data

## 👤 Customer Dashboard Tests
- [ ] Customer dashboard loads: https://vbmstest1.netlify.app/customer-dashboard.html
- [ ] Performance metrics display
- [ ] Quick actions work
- [ ] VAPI widget loads

## 🔗 Navigation Tests
- [ ] Sidebar loads dynamically
- [ ] All sidebar links work
- [ ] Mobile navigation works

## 💳 Payment System Tests
- [ ] Admin affiliates page: https://vbmstest1.netlify.app/admin-affiliates.html
- [ ] Customer affiliates page: https://vbmstest1.netlify.app/customer-affiliates.html
- [ ] Payment widget (when integrated)

## 🖥️ Backend API Tests
- [ ] Health check: https://vbms-fresh-production.up.railway.app/health
- [ ] Auth API responds
- [ ] Payment API responds (with auth)
- [ ] Admin API responds (with auth)
