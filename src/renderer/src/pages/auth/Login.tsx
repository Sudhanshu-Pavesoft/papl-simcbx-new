// src/pages/auth/Login.jsx
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Stack,
  Text,
  Flex,
  Image
} from '@mantine/core'
import Logo1 from '../../assets/logo1.png'
import Logo2 from '../../assets/logo2.png'
import { isNotEmpty, useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { api, unwrap } from '../../api'
import { successNotification } from '../../shared/util/successNotification'
import { errorNotification } from '../../shared/util/errorNotification'
import { useGlobalContext } from '../../shared/ContextProviders/GlobalContextProvider/GlobalContextProvider'

export default function Login() {
  const navigate = useNavigate()
  const { setSessionUser } = useGlobalContext()
  const form = useForm({
    initialValues: {
      username: '',
      password: ''
    },
    validate: {
      username: isNotEmpty('USERNAME IS MANDATORY'),
      password: isNotEmpty('PASSWORD IS MANDATORY')
    }
  })
  //colors for the login page
  const title_color = '#FAFAFA'
  const textInputColor = '#E5E5E5'

  const handleSubmit = () => {
    unwrap(
      api.auth.login({
        username: form.values.username,
        password: form.values.password
      })
    )
      .then((user) => {
        setSessionUser(user)
        navigate('/auto-mode')
        successNotification({ title: 'Success', message: 'Login Successful' })
      })
      .catch(() => {
        errorNotification({ title: 'Error', message: 'Login Failed' })
      })
  }

  return (
    <Container size={500} h={'100vh'} style={{ alignContent: 'center' }}>
      <Flex justify={'center'} gap={24}>
        <Image src={Logo1} w={160} h={40} />
        <Image src={Logo2} w={44} h={44} />
      </Flex>

      <Paper withBorder bg={'#171717'} shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(() => handleSubmit())}>
          <Stack>
            <Flex direction={'column'} align={'center'}>
              <Title ta="center" c={title_color}>
                LOGIN
              </Title>
              <Text mt={4} c={title_color}>
                LOGIN TO ACCESS YOUR USER PROFILE .
              </Text>
            </Flex>
            <TextInput
              label="USER NAME"
              placeholder="Enter username"
              withAsterisk
              c={textInputColor}
              styles={{
                input: {
                  backgroundColor: textInputColor,
                  color: '#0A0A0A',
                  fontSize: '18px',
                  fontWeight: 600
                }
              }}
              {...form.getInputProps('username')}
            />

            <PasswordInput
              label="PASSWORD"
              placeholder="Your password"
              withAsterisk
              c={textInputColor}
              styles={{
                input: {
                  backgroundColor: textInputColor,
                  color: '#0A0A0A',
                  fontSize: '18px',
                  fontWeight: 600
                },
                visibilityToggle: {
                  color: '#F27B48'
                }
              }}
              {...form.getInputProps('password')}
            />

            <Flex direction={'column'} gap={'sm'} mt={'md'}>
              <Button
                variant="gradient"
                gradient={{ from: '#F27B48', to: '#B4522E', deg: 180 }}
                type="submit"
                fullWidth
              >
                <Text size="xl" fw={600} c="#E5E5E5">
                  LOGIN
                </Text>
              </Button>
              <Button
                variant="filled"
                bg="#fb2c36"
                onClick={() => {
                  api.app.exit()
                }}
                fullWidth
              >
                <Text size="xl" fw={600} c="#E5E5E5">
                  EXIT
                </Text>
              </Button>
            </Flex>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
