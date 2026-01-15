/**
 * Browser Console Debug Script for 403 Forbidden Error
 * 
 * Copy and paste this entire script into your browser console (F12 → Console)
 * after logging into the application.
 */

(async function debug403() {
  console.group('🔍 403 FORBIDDEN DEBUG ANALYSIS')
  
  // 1. Check Token
  console.log('1️⃣ TOKEN CHECK:')
  const token = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  
  console.log('  - Access Token exists:', !!token)
  console.log('  - Refresh Token exists:', !!refreshToken)
  
  if (!token) {
    console.error('  ❌ NO TOKEN FOUND - This is the problem!')
    console.log('  💡 Solution: Log in again')
    console.groupEnd()
    return
  }
  
  // 2. Decode Token
  console.log('\n2️⃣ TOKEN DECODE:')
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.error('  ❌ Invalid token format (should have 3 parts)')
      console.groupEnd()
      return
    }
    
    const payload = JSON.parse(atob(parts[1]))
    const now = Date.now() / 1000
    const isExpired = payload.exp ? now > payload.exp : false
    
    console.log('  - User ID:', payload.userId || payload.sub)
    console.log('  - Username:', payload.username)
    console.log('  - Role:', payload.role)
    console.log('  - Issued At:', payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A')
    console.log('  - Expires At:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A')
    console.log('  - Is Expired:', isExpired)
    console.log('  - Time Until Expiry:', payload.exp ? `${Math.floor((payload.exp - now) / 60)} minutes` : 'Unknown')
    
    if (isExpired) {
      console.error('  ❌ TOKEN IS EXPIRED - This is the problem!')
      console.log('  💡 Solution: Log out and log in again')
      console.groupEnd()
      return
    }
    
    if (!payload.role || (payload.role !== 'PATRON' && payload.role !== 'PERSONEL')) {
      console.error('  ❌ INVALID ROLE:', payload.role)
      console.log('  💡 Solution: Check backend token generation')
    }
    
  } catch (e) {
    console.error('  ❌ Token decode error:', e)
    console.groupEnd()
    return
  }
  
  // 3. Check API Configuration
  console.log('\n3️⃣ API CONFIGURATION:')
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const apiBaseUrl = isDev ? '/api' : (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8080/api')
  console.log('  - Environment:', isDev ? 'Development' : 'Production')
  console.log('  - API Base URL:', apiBaseUrl)
  console.log('  - Full URL:', `${apiBaseUrl}/elevators`)
  
  // 4. Test Request
  console.log('\n4️⃣ TEST REQUEST:')
  const testData = {
    identityNumber: "ELEV-004",
    buildingName: "New Business Center",
    address: "456 Residential Avenue, Block B",
    elevatorNumber: "A2",
    floorCount: 4,
    capacity: 450,
    speed: 0.75,
    technicalNotes: "New installation",
    inspectionDate: "2024-01-01",
    expiryDate: "2025-01-01"
  }
  
  console.log('  - Request Body:', JSON.stringify(testData, null, 2))
  console.log('  - Request Headers:', {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token.substring(0, 30)}...`
  })
  
  try {
    console.log('  - Sending request...')
    const response = await fetch(`${apiBaseUrl}/elevators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    })
    
    console.log('  - Response Status:', response.status, response.statusText)
    console.log('  - Response Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseData = await response.json()
    console.log('  - Response Data:', responseData)
    
    if (response.status === 403) {
      console.error('\n❌ 403 FORBIDDEN RECEIVED')
      console.log('  - Error Message:', responseData.message || responseData.error || JSON.stringify(responseData))
      
      console.log('\n💡 POSSIBLE CAUSES:')
      console.log('  1. Role mismatch - Endpoint might require PATRON role')
      console.log('  2. Token expired (but decode showed valid - check server time)')
      console.log('  3. Backend permission check failed')
      console.log('  4. CORS issue (check Network tab for OPTIONS request)')
      console.log('  5. Request body validation failed on backend')
      
      console.log('\n🔍 NEXT STEPS:')
      console.log('  1. Check Network tab → Request Headers → Authorization')
      console.log('  2. Compare with Postman request (same token, same body)')
      console.log('  3. Check backend logs for detailed error')
      console.log('  4. Verify user role in database matches token role')
    } else if (response.ok) {
      console.log('\n✅ REQUEST SUCCEEDED!')
      console.log('  - If this works but frontend doesn\'t, check:')
      console.log('    1. Axios interceptor might be modifying request')
      console.log('    2. Request body format might be different')
      console.log('    3. CORS preflight might be failing')
    } else {
      console.error(`\n❌ ERROR ${response.status}:`, responseData)
    }
    
  } catch (error) {
    console.error('  ❌ Request failed:', error)
    console.log('  - This might be a CORS or network issue')
  }
  
  // 5. Compare with Axios
  console.log('\n5️⃣ AXIOS REQUEST COMPARISON:')
  console.log('  - Check browser console for:')
  console.log('    ✅ Authorization header added')
  console.log('    🔵 Request: (full request details)')
  console.log('    ❌ 403 Forbidden Error (if error occurs)')
  
  console.groupEnd()
  
  console.log('\n📋 SUMMARY:')
  console.log('1. Token exists:', !!token)
  console.log('2. Token valid:', !isExpired)
  console.log('3. Check Network tab for actual request sent')
  console.log('4. Compare request headers with Postman')
  console.log('5. Check backend logs for detailed error message')
})()
