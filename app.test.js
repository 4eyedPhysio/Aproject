require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('./model/users');
const Post = require(`./model/posts`);
const app = require('./app'); // Assuming your Express app instance is exported from app.js
const routes = require(`./Routes/routes`);
const mongoose = require('mongoose');
const { authentication, authorization } = require('./middleware/auth_middleware');

jest.mock('jsonwebtoken');
jest.mock('./model/users');
jest.mock(`./model/posts`);

describe('Authentication Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {
                jwt: 'fake-jwt-token'
            }
        };
        res = {
            locals: {}
        };
        next = jest.fn();
    });

    test('should set req.user and res.locals.user if token is valid', async () => {
        const decodedToken = { id: 'userId' };
        const user = { _id: 'userId', name: 'John Doe' };

        jwt.verify.mockImplementation((token, secret, callback) => callback(null, decodedToken));
        User.findById.mockResolvedValue(user);

        await authentication(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('fake-jwt-token', process.env.SECRET_KEY, expect.any(Function));
        expect(User.findById).toHaveBeenCalledWith('userId');
        expect(req.user).toEqual(user);
        expect(res.locals.user).toEqual(user);
        expect(next).toHaveBeenCalled();
    });

    test('should set res.locals.user to null and call next if token is invalid', async () => {
        jwt.verify.mockImplementation((token, secret, callback) => callback(new Error('Invalid token'), null));

        await authentication(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('fake-jwt-token', process.env.SECRET_KEY, expect.any(Function));
        expect(res.locals.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });

    test('should set res.locals.user to null and call next if no token', async () => {
        req.cookies.jwt = null;

        await authentication(req, res, next);

        expect(res.locals.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });
});

describe('Authorization Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            cookies: {
                jwt: 'fake-jwt-token'
            }
        };
        res = {
            locals: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('should set req.user and call next if token and user are valid', async () => {
        const decodedToken = { id: 'userId' };
        const user = { _id: 'userId', name: 'John Doe' };

        jwt.verify.mockReturnValue(decodedToken);
        User.findById.mockResolvedValue(user);

        await authorization(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('fake-jwt-token', process.env.SECRET_KEY);
        expect(User.findById).toHaveBeenCalledWith('userId');
        expect(req.user).toEqual(user);
        expect(next).toHaveBeenCalled();
    });

    test('should respond with 404 if token is not present', async () => {
        req.cookies.jwt = null;

        await authorization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'please log in' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should respond with 404 if user is not found', async () => {
        const decodedToken = { id: 'userId' };

        jwt.verify.mockReturnValue(decodedToken);
        User.findById.mockResolvedValue(null);

        await authorization(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('fake-jwt-token', process.env.SECRET_KEY);
        expect(User.findById).toHaveBeenCalledWith('userId');
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'please log in' });
        expect(next).not.toHaveBeenCalled();
    });

    test('should respond with 404 if token is invalid', async () => {
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        await authorization(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'please log in' });
        expect(next).not.toHaveBeenCalled();
    });
});

describe('Registration Route', () => {
    beforeAll(() => {
        // Mock JWT token creation
        jwt.sign.mockImplementation((payload, secret, options) => 'fake-jwt-token');
    });

    afterAll(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        await mongoose.disconnect();
    });

    test('should register a new user and return a JWT token', async () => {
        // Mock request body
        const userData = {
            First_name: 'John',
            Last_name: 'Doe',
            email: 'john@example.com',
            password: 'password123',
            Date_registered: new Date().toISOString() // Ensure consistent date format
        };

        // Mock the create method of User model
        const createdUser = { ...userData, _id: 'userId' };
        User.create.mockResolvedValue(createdUser);

        // Make a request to the registration route
        const response = await request(app)
            .post('/register')
            .send(userData);

        // Ensure the response status is 200
        expect(response.status).toBe(200);

        // Ensure the response contains the user object and a JWT token
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body.user).toEqual(createdUser);
        expect(response.header['set-cookie'][0]).toMatch(/^jwt=fake-jwt-token/); // Ensure JWT cookie is set

        // Ensure the User model's create method was called with the correct data
        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            First_name: 'John',
            Last_name: 'Doe',
            email: 'john@example.com',
            password: 'password123',
        }));
    });

    test('should handle registration failure', async () => {
        // Mock request body
        const userData = {
            First_name: 'John',
            Last_name: 'Doe',
            email: 'john@example.com',
            password: 'password123',
            Date_registered: new Date().toISOString() // Ensure consistent date format
        };

        // Mocking User.create to throw an error
        const errorMessage = 'User registration failed';
        User.create.mockRejectedValue(new Error(errorMessage));

        // Make a request to the registration route
        const response = await request(app)
            .post('/register')
            .send(userData);

        // Ensure the response status is 400
        expect(response.status).toBe(400);

        // Ensure the response contains the error message
        expect(response.body).toHaveProperty('message', 'Unable to register');
        expect(response.body).toHaveProperty('error', errorMessage);
    });
});

describe('Signin Route', () => {
    beforeAll(() => {
        // Mock JWT token creation
        jwt.sign.mockImplementation((payload, secret, options) => 'fake-jwt-token');
    });

    afterAll(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        await mongoose.disconnect();
    });

    test('should log in an existing user and return a JWT token', async () => {
        // Mock request body
        const loginData = {
            email: 'john@example.com',
            password: 'password123'
        };

        // Mock the login method of User model
        const loggedInUser = { _id: 'userId', email: 'john@example.com', password: 'password123' };
        User.login.mockResolvedValue(loggedInUser);

        // Make a request to the login route
        const response = await request(app)
            .post('/login')
            .send(loginData);

        // Ensure the response status is 200
        expect(response.status).toBe(200);

        // Ensure the response contains the user id and a JWT token
        expect(response.body).toHaveProperty('user', loggedInUser._id);
        expect(response.body).toHaveProperty('message', 'login successful');
        expect(response.header['set-cookie'][0]).toMatch(/^jwt=fake-jwt-token/); // Ensure JWT cookie is set

        // Ensure the User model's login method was called with the correct data
        expect(User.login).toHaveBeenCalledWith(loginData.email, loginData.password);
    });

    test('should handle missing credentials', async () => {
        // Mock request body with missing email
        const loginData = {
            password: 'password123'
        };

        // Make a request to the login route
        const response = await request(app)
            .post('/login')
            .send(loginData);

        // Ensure the response status is 400
        expect(response.status).toBe(400);

        // Ensure the response contains the error message
        expect(response.body).toEqual({
            errors: { email: 'email is required', password: 'password is required' }
        });
    });

    test('should handle incorrect credentials', async () => {
        // Mock request body with incorrect credentials
        const loginData = {
            email: 'john@example.com',
            password: 'wrongpassword'
        };

        // Mock the login method of User model to throw an error
        User.login.mockRejectedValue(new Error('Invalid credentials'));

        // Make a request to the login route
        const response = await request(app)
            .post('/login')
            .send(loginData);

        // Ensure the response status is 400
        expect(response.status).toBe(400);

        // Ensure the response contains the error message
        expect(response.body).toEqual({ message: 'Invalid credentials' });
    });
});

describe('Blog Routes', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clearing mocks before each test
    });
  
    // Test cases for the /blog POST route
    describe('POST /blog', () => {
        // Test case for successful creation of a new post
        // Test case for successful creation of a new post
     // Test case for successful creation of a new post
// Import the authentication middleware
const { authentication } = require('./middleware/auth_middleware');

// Test case for successful creation of a new post
test('should create a new post', async () => {
  // Mock request body
  const reqBody = {
    title: 'Test Post',
    description: 'This is a test post',
    tags: ['test', 'unit'],
    body: 'This is the body of the test post',
  };

  // Mock the create method of the Post model
  const createdPost = { ...reqBody, _id: 'postId', read_count: 0 };
  Post.create.mockResolvedValue(createdPost);

  // Mock the authorization middleware
  const req = { 
    body: reqBody, 
    user: { _id: 'userId' },
    cookies: { jwt: 'fake-jwt-token' } // Mocking the jwt cookie
  };
  const res = { 
    status: jest.fn().mockReturnThis(), 
    json: jest.fn(),
    locals: {} // Initialize locals property
  };
  const next = jest.fn();

  // Mock the authentication middleware to resolve successfully
  authentication.mockImplementation((req, res, next) => {
    // Assume the token is valid and set the user in req
    req.user = { _id: 'userId' };
    next();
  });

  // Extract the callback function for the route
  const routeCallback = routes.stack.find((layer) => layer.route && layer.route.path === '/blog').route.stack[0].handle;

  // Call the route callback with the mock request, response, and next functions
  await routeCallback(req, res, next);

  // Assertion
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith({ message: 'post created', post: createdPost });
});
        // Add more test cases for different scenarios (e.g., unauthorized access, error handling)
      });
    // Add test cases for other routes (/blog GET, /blog/:id GET, /blog/author/Post GET, etc.)
  });