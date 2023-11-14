import Container from './container'

const Footer = () => {
  return (
    <footer className="bg-black border-t border-blue">
      <Container>
        <div className="py-28 flex flex-col lg:flex-row items-center justify-between">
          <a href="https://hogan.dev">
            <h3 className="text-gold text-4xl lg:text-[2.5rem] font-bold tracking-tighter leading-tight text-center lg:text-left mb-10 lg:mb-0 lg:pr-4 lg:w-1/2">
              hogan.dev
            </h3>
          </a>
          <div className="flex flex-col lg:flex-row lg:justify-end justify-center items-center lg:pl-4 lg:w-1/2">
            <a
              href="https://www.linkedin.com/in/hogan-mcdonald"
              className="mx-3 bg-black hover:bg-blue hover:text-black border border-black text-blue font-bold py-3 px-12 lg:px-8 duration-200 transition-colors mb-6 lg:mb-0"
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/HoganMcDonald"
              className="mx-3 bg-black hover:bg-blue hover:text-black border border-black text-blue font-bold py-3 px-12 lg:px-8 duration-200 transition-colors mb-6 lg:mb-0"
            >
              GitHub
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
