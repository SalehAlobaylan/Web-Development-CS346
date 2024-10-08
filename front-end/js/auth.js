import { api } from './api.js';

async function register(fullName, phoneNumber, email, password) {
    try {
        const data = await api.post('/auth/register', { fullName, phoneNumber, email, password });
        console.log(data); // Log the response to see if the token is returned correctly

            localStorage.setItem('token', data.token); // If the API returns a token
            localStorage.setItem('user', JSON.stringify(data.user));

            loginUser(phoneNumber, password);
    } catch (error) {
        console.error('Registration error:', error.message);
    }
}


const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        const phoneNumber = '966' +  document.getElementById('phoneNumber').value.trim().slice(-9);
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        register(fullName, phoneNumber, email, password);
    });
}

async function loginUser(phoneNumber, password) {
    try {
        const data = await api.post('/auth/login', { phoneNumber, password });
        console.log(data); 

        if (data.token) {
            localStorage.setItem('token', data.token); 
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Login successful');
            window.location.href = './home_page.html';
        } else {
            throw new Error('No token received from server');
        }

    } catch (error) {
        console.error('Login error:', error.message);
    }
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const phoneNumber = '966' + document.getElementById('phoneNumber').value.trim().slice(-9);
        const password = document.getElementById('password').value.trim();

        loginUser(phoneNumber, password);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    if (api.isAuthenticated()) {
        window.location.href = 'home_page.html';
    }
})