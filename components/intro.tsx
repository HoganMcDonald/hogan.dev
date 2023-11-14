import Avatar from './avatar'

const Intro = () => {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        hogan.dev
      </h1>
      <div className="flex items-center mt-5">
        <h4 className="text-center md:text-left text-lg mr-4 md:pl-8">
          a blog by Hogan McDonald
        </h4>
        <Avatar picture="/assets/avatar.jpg" name="" />
      </div>
    </section>
  )
}

export default Intro
