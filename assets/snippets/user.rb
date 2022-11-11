# You can optionally generate .rbs too! (scroll to bottom)

require 'json'
require 'time'

module Example
  class User
    attr_accessor :created_at
    attr_accessor :id
    attr_accessor :is_admin
    attr_accessor :karma

    def self.from_json_data(data)
      out = User.new
      out.created_at = Example::from_json_data(DateTime, data["createdAt"])
      out.id = Example::from_json_data(String, data["id"])
      out.is_admin = Example::from_json_data(TrueClass, data["isAdmin"])
      out.karma = Example::from_json_data(Integer, data["karma"])
      out
    end

    def to_json_data
      data = {}
      data["createdAt"] = Example::to_json_data(created_at)
      data["id"] = Example::to_json_data(id)
      data["isAdmin"] = Example::to_json_data(is_admin)
      data["karma"] = Example::to_json_data(karma)
      data
    end
  end

  private

  def self.from_json_data(type, data)
    if data.nil? || [Object, TrueClass, Integer, Float, String].include?(type)
      data
    elsif type == DateTime
      DateTime.rfc3339(data)
    elsif type.is_a?(Array)
      data.map { |elem| from_json_data(type.first, elem) }
    elsif type.is_a?(Hash)
      data.transform_values { |elem| from_json_data(type.values.first, elem) }
    else
      type.from_json_data(data)
    end
  end

  def self.to_json_data(data)
    if data.nil? || [TrueClass, FalseClass, Integer, Float, String].include?(data.class)
      data
    elsif data.is_a?(DateTime)
      data.rfc3339
    elsif data.is_a?(Array)
      data.map { |elem| to_json_data(elem) }
    elsif data.is_a?(Hash)
      data.transform_values { |elem| to_json_data(elem) }
    else
      data.to_json_data
    end
  end
end

# If you enable it, you'll also get a .rbs file:

module Example
  class User
    attr_accessor created_at: DateTime
    attr_accessor id: String
    attr_accessor is_admin: bool
    attr_accessor karma: Integer

    def self.from_json_data: (untyped) -> User
    def to_json_data: () -> untyped
  end

  def self.from_json_data: (untyped, untyped) -> untyped
  def self.to_json_data: (untyped) -> untyped
end
