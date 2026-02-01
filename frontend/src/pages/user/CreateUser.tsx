import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUser ,fetchAllDepartments} from '../../services/api';

const userSchema = z.object({
    name: z.string().min(2, { message: 'Name is required' }).max(120),
    email: z.string().email({message: 'Email is required'}),
    phone: z.string().min(10, {message: 'Phone is required'}),
    role: z.enum(['STUDENT','PROFESSOR','HOD'], {required_error: 'Role is required'}),
    departmentId: z.string({required_error: 'Department is required'}),
    password: z.string().min(6, {message: 'Password must be minimum 6 characters'})
});

type UserFormValues = z.infer<typeof userSchema>

const defaultValues: UserFormValues = {
    name: '',
    email:'',
    phone:'',
    role:'STUDENT',
    departmentId:'',
    password:''
};

const CreatUserPage = () =>{
    const [serverMessage, setServerMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [departments, setDepartments] = useState<{id: number; name: string}[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting}
    } = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues
    });

    useEffect(()=>{
        fetchAllDepartments()
        .then((res: any) => {
            setDepartments(res.data.items);
        })
        .catch((err: any) => {
            console.log(err);
        })
    }, []);

    const onSubmit = async (values: UserFormValues) => {
        setServerMessage(null);
        setServerError(null);
        try {
            const response = await createUser(values);
            setServerMessage(response?.message ?? 'User created successfully');
            reset(defaultValues);
        } catch (error: any) {
            if(error?.response?.data?.message){
                setServerError(error.response.data.message);
            }
            else{
                setServerError('Failed to create user');
            }
        }
    };


    return(
        <div className='card'>
            <h2>Create User</h2>
            <p>Create login accounts for platform users</p>

            <form className='form' onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className='form__group'>
                    <label className='form__label'>Name</label>
                    <input className='form__input' {...register('name')} />
                    {errors.name && <span className='form__error'>{errors.name.message}</span>}
                </div>

                <div className='form__group'>
                    <label className='form__label'>Email</label>
                    <input className='form__input' {...register('email')} />
                    {errors.email && <span className='form__error'>{errors.email.message}</span>}
                </div>

                <div className='form__group'>
                    <label className='form__label'>Phone</label>
                    <input className='form__input' {...register('phone')} />
                    {errors.phone && <span className='form__error'>{errors.phone.message}</span>}
                </div>

                <div className='form__group'>
                    <label className='form__label'>Role</label>
                    <select className='form_select' {...register('role')}>
                        <option value="STUDENT">Student</option>
                        <option value="PROFESSOR">Professor</option>
                        <option value="HOD">HOD</option>
                    </select>
                    {errors.role && <span className='form__error'>{errors.role.message}</span>}
                </div>

                <div className='form__group'>
                    <label className='form__label'>Department</label>
                    <select className='form_select' {...register('departmentId')}>
                        <option value="">Select department...</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                    {errors.departmentId && <span className='form__error'>{errors.departmentId.message}</span>}
                </div>

                <div className='form__group'>
                    <label className='form__label'>Password</label>
                    <input className='form__input' {...register('password')} />
                    {errors.password && <span className='form__error'>{errors.password.message}</span>}
                </div>

                {serverMessage && <div className='form__success'>{serverMessage}</div>}
                {serverError && <div className='error'>{serverError}</div>}

                <button className='button' disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Create User'}
                </button>
            </form>
        </div>
    );
};

export default CreatUserPage;