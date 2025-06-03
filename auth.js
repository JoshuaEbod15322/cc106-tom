// ====== SUPABASE INIT ======
const supabaseUrl = "https://ylpobdngzcmevybvnshk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscG9iZG5nemNtZXZ5YnZuc2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzExNTAsImV4cCI6MjA2NDQ0NzE1MH0._Cbd60nMt6Cgyqg-Sq24YLVk617Gl9Pn_Zgt3PkpBSQ";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ====== MESSAGE DISPLAY ======
function showMessage(message, isSuccess = false) {
    const msgDiv = document.getElementById('formMessage');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = 'form-message' + (isSuccess ? ' success' : '');
}

// ====== SIGNUP HANDLER ======
async function handleSignup(event) {
    event.preventDefault();
    const fullName = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;
    const password_hash = password; // For demo only! Hash in production.

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName || !email || !password || !userType) {
        showMessage('Please fill in all required fields.');
        return;
    }
    if (!emailPattern.test(email)) {
        showMessage('Please enter a valid email address.');
        return;
    }

    const { data: seeker } = await supabase
        .from('job_seekers')
        .select('id')
        .eq('email', email)
        .single();

    if (seeker) {
        showMessage('Account already exists with this email.');
        return;
    }

    if (userType === 'employer') {
        const companyName = document.getElementById('companyName').value.trim();
        if (!companyName) {
            showMessage('Please enter your company name.');
            return;
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });
        if (signUpError) {
            showMessage(signUpError.message || 'Signup failed');
            return;
        }
        if (!signUpData.user) {
            showMessage('Please check your email to confirm your account before continuing.');
            return;
        }
        const userId = signUpData.user.id;
        const { error: employerInsertError } = await supabase
            .from('employers')
            .insert([{
                id: userId,
                full_name: fullName,
                email,
                password_hash: password,
                company_name: companyName
            }]);
        if (employerInsertError) {
            showMessage(employerInsertError.message || 'Signup failed');
            return;
        }
        showMessage('Done creating account', true);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    } else {
        const { error: seekerInsertError } = await supabase
            .from('job_seekers')
            .insert([{
                full_name: fullName,
                email,
                password_hash
            }]);
        if (seekerInsertError) {
            showMessage(seekerInsertError.message || 'Signup failed');
            return;
        }
        showMessage('Done creating account', true);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    }
}

// ====== LOGIN HANDLER ======
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Please enter both email and password.');
        return;
    }

    const { data: seeker, error: seekerError } = await supabase
        .from('job_seekers')
        .select('*')
        .eq('email', email)
        .single();

    if (seeker && seeker.password_hash === password) {
        localStorage.setItem('userProfile', JSON.stringify({ id: seeker.id, userType: 'jobseeker', name: seeker.full_name }));
        showMessage('Login successful', true);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1200);
        return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (signInError) {
        showMessage(signInError.message || 'Account not exist');
        return;
    }
    const userId = signInData.user.id;

    let { data: employer, error: employerError } = await supabase
        .from('employers')
        .select('*')
        .eq('id', userId)
        .single();

    if (!employer) {
        const companyName = "Your Company";
        const fullName = signInData.user.user_metadata?.full_name || "Employer";
        const { error: insertError } = await supabase
            .from('employers')
            .insert([{
                id: userId,
                full_name: fullName,
                email,
                password_hash: password,
                company_name: companyName
            }]);
        if (insertError) {
            showMessage(insertError.message || 'Could not create employer profile');
            return;
        }
        const { data: newEmployer } = await supabase
            .from('employers')
            .select('*')
            .eq('id', userId)
            .single();
        employer = newEmployer;
    }

    if (employer) {
        localStorage.setItem('userProfile', JSON.stringify({ id: employer.id, userType: 'employer', name: employer.full_name }));
        showMessage('Login successful', true);
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1200);
        return;
    }

    showMessage('Account not exist');
}

// ====== LOGOUT HANDLER ======
function handleLogout() {
    localStorage.removeItem('userProfile');
    if (supabase && supabase.auth && supabase.auth.signOut) {
        supabase.auth.signOut().then(() => {
            window.location.href = "login.html";
        }).catch(() => {
            window.location.href = "login.html";
        });
    } else {
        window.location.href = "login.html";
    }
}

// ====== LOGOUT BUTTONS EVENT ======
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.onclick = handleLogout;
    });
});

// ====== USER PROFILE DISPLAY ======
async function displayUserNameAndType() {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    const nameElement = document.getElementById('userName');
    const typeElement = document.getElementById('userTypeDisplay');
    const companyElement = document.getElementById('companyName');
    const emailElement = document.getElementById('emailText');

    if (userProfile && nameElement) {
        nameElement.textContent = userProfile.name;
        if (typeElement) {
            typeElement.textContent = userProfile.userType === 'employer'
                ? 'Employer'
                : userProfile.userType === 'jobseeker'
                    ? 'Job Seeker'
                    : '';
        }
        if (userProfile.userType === 'employer') {
            const { data, error } = await supabase
                .from('employers')
                .select('company_name, email')
                .eq('id', userProfile.id)
                .single();
            if (companyElement) companyElement.textContent = (data && data.company_name) ? data.company_name : '';
            if (emailElement) emailElement.textContent = (data && data.email) ? data.email : '';
        } else if (userProfile.userType === 'jobseeker') {
            const { data, error } = await supabase
                .from('job_seekers')
                .select('email')
                .eq('id', userProfile.id)
                .single();
            if (emailElement) emailElement.textContent = (data && data.email) ? data.email : '';
        }
    } else if (nameElement) {
        nameElement.textContent = "N/A";
        if (typeElement) typeElement.textContent = "";
        if (companyElement) companyElement.textContent = "";
        if (emailElement) emailElement.textContent = "";
    }
}

document.addEventListener('DOMContentLoaded', displayUserNameAndType);