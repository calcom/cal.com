import { useRef } from 'react';

export default function add() {
    const usernameInputRef = useRef();
    const emailInputRef = useRef();
    const passwordInputRef = useRef();

    async function createUser(username, email, password) {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({username, email, password}),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
        }

        return data;
    }

    async function submitHandler(event) {
        event.preventDefault();

        const enteredUsername = usernameInputRef.current.value;
        const enteredEmail = emailInputRef.current.value;
        const enteredPassword = passwordInputRef.current.value;

        // TODO: Add validation

        try {
            const result = await createUser(enteredUsername, enteredEmail, enteredPassword);
            console.log(result);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <form onSubmit={submitHandler}>
            <input type="text" id="username" name="username" placeholder="Username" ref={usernameInputRef} />
            <input type="text" id="email" name="email" placeholder="Email Address" ref={emailInputRef}/>
            <input type="text" id="password" name="password" placeholder="Password" ref={passwordInputRef}/>
            <input type="submit" value="Sign up"/>
        </form>
    );
}